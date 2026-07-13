import { Injectable, Logger } from '@nestjs/common';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { AnthropicService } from '../anthropic/anthropic.service';
import { AtlasService } from '../agents/atlas.service';
import { HermesService } from '../agents/hermes.service';
import { ZEUS_AGENTIC_PROMPT } from '../agents/zeus.prompt';
import { OrchestrationStoreService } from './orchestration-store.service';

export interface ConsultationRecord {
  tool: string;
  query: string;
  elapsedMs: number;
  error?: string;
}

export interface AgenticEvent {
  type:
    | 'iteration'
    | 'commentary'
    | 'tool_call'
    | 'tool_result'
    | 'tool_error'
    | 'web_search';
  iteration?: number;
  tool?: string;
  query?: string;
  text?: string;
  elapsedMs?: number;
  error?: string;
}

export interface AgenticOrchestrationResult {
  id: string;
  createdAt: string;
  mode: 'agentic';
  brief: string;
  /** Registro de cada consulta que ZEUS decidió hacer, en orden. */
  consultations: ConsultationRecord[];
  iterations: number;
  synthesis: string;
  metrics: {
    totalElapsedMs: number;
    inputTokens: number;
    outputTokens: number;
  };
}

type AgenticListener = (event: AgenticEvent) => void;

const MAX_ITERATIONS = 8;

/**
 * Orquestador agéntico: en lugar del pipeline fijo de 3 fases, ZEUS corre
 * en un loop de tool-use donde él decide a quién consultar, puede
 * re-consultar para resolver tensiones y puede buscar datos en la web
 * antes de entregar la síntesis.
 */
@Injectable()
export class AgenticOrchestratorService {
  private readonly logger = new Logger(AgenticOrchestratorService.name);

  constructor(
    private readonly anthropic: AnthropicService,
    private readonly atlas: AtlasService,
    private readonly hermes: HermesService,
    private readonly store: OrchestrationStoreService,
  ) {}

  async orchestrate(
    brief: string,
    onEvent?: AgenticListener,
  ): Promise<AgenticOrchestrationResult> {
    const t0 = Date.now();
    const consultations: ConsultationRecord[] = [];

    const emit = (event: AgenticEvent) => {
      try {
        onEvent?.(event);
      } catch {
        // Un listener roto no debe tumbar la orquestación.
      }
    };

    // Cada arquitecto es una tool: ejecutarla registra la consulta y
    // devuelve el output (o el error como texto, para que ZEUS se adapte).
    const makeArchitectTool = (
      name: string,
      description: string,
      agent: { consult(q: string): Promise<string> },
    ) =>
      betaTool({
        name,
        description,
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                'Consulta autocontenida para el arquitecto. Él no ve el brief ni la conversación: incluye todo el contexto necesario.',
            },
          },
          required: ['query'],
        } as const,
        run: async ({ query }) => {
          emit({ type: 'tool_call', tool: name, query });
          const start = Date.now();
          try {
            const output = await agent.consult(query);
            const elapsedMs = Date.now() - start;
            consultations.push({ tool: name, query, elapsedMs });
            emit({ type: 'tool_result', tool: name, elapsedMs });
            return output;
          } catch (err) {
            const elapsedMs = Date.now() - start;
            const message = err instanceof Error ? err.message : String(err);
            consultations.push({ tool: name, query, elapsedMs, error: message });
            emit({ type: 'tool_error', tool: name, elapsedMs, error: message });
            this.logger.error(`${name} failed: ${message}`);
            return `[ERROR: la consulta a este arquitecto falló (${message}). Continúa sin esta perspectiva y señala el vacío en tu síntesis.]`;
          }
        },
      });

    const consultAtlas = makeArchitectTool(
      'consult_atlas',
      'Consulta a ATLAS, arquitecto de software y sistemas (elite). Úsalo para preguntas de arquitectura, stack, infraestructura, escalabilidad, seguridad e implementación técnica. Es ciego ante restricciones de negocio.',
      this.atlas,
    );
    const consultHermes = makeArchitectTool(
      'consult_hermes',
      'Consulta a HERMES, arquitecto de negocios. Úsalo para modelo de negocio, pricing, mercado, go-to-market y riesgos comerciales. Es ciego ante la complejidad técnica real.',
      this.hermes,
    );

    this.logger.log('═══ Starting agentic orchestration ═══');

    const runner = this.anthropic.sdk.beta.messages.toolRunner({
      model: this.anthropic.modelId,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: ZEUS_AGENTIC_PROMPT,
      messages: [{ role: 'user', content: `BRIEF DEL USUARIO:\n\n${brief}` }],
      tools: [
        consultAtlas,
        consultHermes,
        { type: 'web_search_20260209', name: 'web_search', max_uses: 5 },
      ],
      max_iterations: MAX_ITERATIONS,
    });

    let iterations = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let finalMessage: Anthropic.Beta.BetaMessage | null = null;

    for await (const message of runner) {
      iterations++;
      inputTokens += message.usage.input_tokens;
      outputTokens += message.usage.output_tokens;
      emit({ type: 'iteration', iteration: iterations });
      this.logger.log(
        `Iteration ${iterations} · stop:${message.stop_reason} · ` +
        `in:${message.usage.input_tokens} out:${message.usage.output_tokens}`,
      );

      for (const block of message.content) {
        if (block.type === 'text' && block.text.trim()) {
          emit({ type: 'commentary', iteration: iterations, text: block.text });
        } else if (block.type === 'server_tool_use' && block.name === 'web_search') {
          const query = (block.input as { query?: string })?.query ?? '';
          consultations.push({ tool: 'web_search', query, elapsedMs: 0 });
          emit({ type: 'web_search', iteration: iterations, query });
        }
      }

      // El tool runner no reanuda pause_turn solo (loop server-side de
      // web_search): hay que devolver el turno del asistente para continuar.
      if (message.stop_reason === 'pause_turn') {
        runner.pushMessages({ role: 'assistant', content: message.content });
        continue;
      }

      finalMessage = message;
    }

    const synthesis = (finalMessage?.content ?? [])
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!synthesis) {
      throw new Error(
        `Agentic loop ended without a synthesis after ${iterations} iterations ` +
        `(stop_reason: ${finalMessage?.stop_reason ?? 'unknown'})`,
      );
    }

    const totalElapsedMs = Date.now() - t0;
    this.logger.log(
      `═══ Agentic orchestration complete in ${totalElapsedMs}ms · ` +
      `${iterations} iterations · ${consultations.length} consultations ═══`,
    );

    const result: AgenticOrchestrationResult = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      mode: 'agentic',
      brief,
      consultations,
      iterations,
      synthesis,
      metrics: { totalElapsedMs, inputTokens, outputTokens },
    };

    try {
      await this.store.save(result);
    } catch (err) {
      this.logger.warn(`Failed to persist orchestration ${result.id}: ${err}`);
    }

    return result;
  }
}
