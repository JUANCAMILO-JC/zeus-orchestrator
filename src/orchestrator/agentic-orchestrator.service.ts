import { Injectable, Logger } from '@nestjs/common';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { AnthropicService } from '../anthropic/anthropic.service';
import { ApoloService } from '../agents/apolo.service';
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
    | 'web_search'
    | 'compaction';
  iteration?: number;
  tool?: string;
  query?: string;
  text?: string;
  elapsedMs?: number;
  error?: string;
  /** Solo en eventos `compaction`: false si el servidor no logró producir un resumen válido. */
  succeeded?: boolean;
}

export type AgenticListener = (event: AgenticEvent) => void;

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

/** Resultado de un solo turno del loop agéntico, reutilizable por sesiones multi-turno. */
export interface AgenticTurnResult {
  /** Historial completo de mensajes tras el turno — pásalo tal cual al siguiente turno. */
  messages: Anthropic.Beta.BetaMessageParam[];
  synthesis: string;
  consultations: ConsultationRecord[];
  iterations: number;
  usage: { inputTokens: number; outputTokens: number };
}

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
    private readonly apolo: ApoloService,
    private readonly store: OrchestrationStoreService,
  ) {}

  /**
   * Modo one-shot: crea el turno inicial a partir de un brief y persiste
   * el resultado. No conserva el historial — para conversación multi-turno
   * usa `runTurn` directamente (ver SessionsService).
   */
  async orchestrate(
    brief: string,
    onEvent?: AgenticListener,
  ): Promise<AgenticOrchestrationResult> {
    const t0 = Date.now();
    this.logger.log('═══ Starting agentic orchestration ═══');

    const initialMessages: Anthropic.Beta.BetaMessageParam[] = [
      { role: 'user', content: `BRIEF DEL USUARIO:\n\n${brief}` },
    ];
    const turn = await this.runTurn(initialMessages, onEvent);
    const totalElapsedMs = Date.now() - t0;
    this.logger.log(
      `═══ Agentic orchestration complete in ${totalElapsedMs}ms · ` +
      `${turn.iterations} iterations · ${turn.consultations.length} consultations ═══`,
    );

    const result: AgenticOrchestrationResult = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      mode: 'agentic',
      brief,
      consultations: turn.consultations,
      iterations: turn.iterations,
      synthesis: turn.synthesis,
      metrics: {
        totalElapsedMs,
        inputTokens: turn.usage.inputTokens,
        outputTokens: turn.usage.outputTokens,
      },
    };

    try {
      await this.store.save(result);
    } catch (err) {
      this.logger.warn(`Failed to persist orchestration ${result.id}: ${err}`);
    }

    return result;
  }

  /**
   * Corre un solo turno del loop agéntico sobre un historial de mensajes
   * dado. No persiste nada — el llamador decide qué hacer con el
   * historial actualizado que devuelve (ej. guardarlo como sesión).
   */
  async runTurn(
    messages: Anthropic.Beta.BetaMessageParam[],
    onEvent?: AgenticListener,
  ): Promise<AgenticTurnResult> {
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
    const consultApolo = makeArchitectTool(
      'consult_apolo',
      'Consulta a APOLO, arquitecto de publicidad y marketing. Úsalo para marca, posicionamiento, canales de adquisición, funnels, campañas y métricas de marketing. Es ciego ante la complejidad técnica y los unit economics profundos.',
      this.apolo,
    );

    const runner = this.anthropic.sdk.beta.messages.toolRunner({
      model: this.anthropic.modelId,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: ZEUS_AGENTIC_PROMPT,
      messages,
      tools: [
        consultAtlas,
        consultHermes,
        consultApolo,
        { type: 'web_search_20260209', name: 'web_search', max_uses: 5 },
      ],
      max_iterations: MAX_ITERATIONS,
      // Compactación server-side: en sesiones largas, el historial que se
      // reenvía en cada turno puede acercarse al límite de contexto. El
      // servidor resume automáticamente lo más antiguo antes de ese punto;
      // el bloque de compactación viaja dentro de la respuesta y el tool
      // runner ya lo persiste al acumular messages (ver runner.params.messages).
      betas: ['compact-2026-01-12'],
      context_management: {
        edits: [
          {
            type: 'compact_20260112',
            pause_after_compaction: false,
            trigger: { type: 'input_tokens', value: this.anthropic.compactionTriggerTokens },
            instructions:
              'Conserva en el resumen las cifras concretas (presupuestos, precios, costos), las ' +
              'decisiones técnicas y de negocio tomadas, y qué arquitecto dijo qué — el usuario ' +
              'puede referirse a estos detalles en preguntas de seguimiento.',
          },
        ],
      },
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
        } else if (block.type === 'compaction') {
          const succeeded = block.content !== null;
          this.logger.log(
            `Context compacted at iteration ${iterations} (${succeeded ? 'ok' : 'failed — treated as no-op'})`,
          );
          emit({ type: 'compaction', iteration: iterations, succeeded });
        }
      }

      // web_search con filtrado dinámico corre código server-side en un
      // container propio. Si queda trabajo pendiente en ese container al
      // terminar esta iteración, la siguiente request debe reenviar su id
      // o la API responde 400 ("container_id is required..."). El tool
      // runner no hace este seguimiento por su cuenta — hay que setearlo
      // nosotros para que la próxima llamada interna lo incluya.
      if (message.container?.id) {
        runner.setMessagesParams((prev) => ({ ...prev, container: message.container!.id }));
      }

      // El tool runner no reanuda solo dos casos: pause_turn (loop
      // server-side de web_search) y, por defensividad, compaction — con
      // pause_after_compaction:false no debería ocurrir, pero si el
      // servidor decide pausar igual, hay que devolver el turno del
      // asistente para continuar en vez de terminar sin síntesis.
      if (message.stop_reason === 'pause_turn' || message.stop_reason === 'compaction') {
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

    // El runner acumula internamente el historial completo (mensajes de
    // usuario, respuestas del asistente y resultados de tools) — es lo
    // que hay que persistir para poder continuar la conversación después.
    const updatedMessages = runner.params.messages ?? messages;

    return {
      messages: updatedMessages,
      synthesis,
      consultations,
      iterations,
      usage: { inputTokens, outputTokens },
    };
  }
}
