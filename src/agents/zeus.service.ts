import { Injectable } from '@nestjs/common';
import { AnthropicService } from '../anthropic/anthropic.service';
import {
  ZEUS_DECOMPOSITION_PROMPT,
  ZEUS_SYNTHESIS_PROMPT,
} from './zeus.prompt';

export interface DecompositionResult {
  analysis: string;
  dimensions: {
    technical: string[];
    business: string[];
    marketing: string[];
  };
  queries: {
    atlas: string | null;
    hermes: string | null;
    apolo: string | null;
  };
}

/**
 * Valida la estructura mínima que el orquestador necesita para operar.
 * Devuelve un mensaje de error o null si es válida.
 */
export function validateDecomposition(value: unknown): string | null {
  const v = value as Partial<DecompositionResult>;
  if (!v || typeof v !== 'object') {
    return 'la respuesta no es un objeto';
  }
  if (typeof v.analysis !== 'string' || v.analysis.length === 0) {
    return 'falta el campo "analysis" (string)';
  }
  if (!v.queries || typeof v.queries !== 'object') {
    return 'falta el campo "queries" (objeto)';
  }
  for (const key of ['atlas', 'hermes', 'apolo'] as const) {
    const q = v.queries[key];
    if (q !== null && q !== undefined && typeof q !== 'string') {
      return `"queries.${key}" debe ser string o null`;
    }
  }
  if (v.queries.atlas == null && v.queries.hermes == null && v.queries.apolo == null) {
    return 'todas las queries son null — al menos un arquitecto debe ser consultado';
  }
  return null;
}

@Injectable()
export class ZeusService {
  constructor(private readonly anthropic: AnthropicService) {}

  /**
   * Modo 1: descompone el brief en consultas para cada arquitecto.
   */
  async decompose(brief: string): Promise<DecompositionResult> {
    const result = await this.anthropic.completeJson<DecompositionResult>({
      systemPrompt: ZEUS_DECOMPOSITION_PROMPT,
      userMessage: `BRIEF DEL USUARIO:\n\n${brief}`,
      agentName: 'ZEUS-decompose',
      maxTokens: 2048,
      validate: validateDecomposition,
    });

    // Normaliza campos opcionales para que el resto del pipeline no
    // tenga que defenderse de undefined.
    return {
      analysis: result.analysis,
      dimensions: {
        technical: result.dimensions?.technical ?? [],
        business: result.dimensions?.business ?? [],
        marketing: result.dimensions?.marketing ?? [],
      },
      queries: {
        atlas: result.queries.atlas ?? null,
        hermes: result.queries.hermes ?? null,
        apolo: result.queries.apolo ?? null,
      },
    };
  }

  /**
   * Modo 2: sintetiza los outputs de los arquitectos en una decisión integrada.
   */
  async synthesize(params: {
    brief: string;
    atlasOutput: string | null;
    hermesOutput: string | null;
    apoloOutput: string | null;
  }): Promise<string> {
    const { brief, atlasOutput, hermesOutput, apoloOutput } = params;

    const userMessage = [
      '## BRIEF ORIGINAL',
      brief,
      '',
      '## RESPUESTA DE ATLAS (técnico)',
      atlasOutput || '[ATLAS no fue consultado para este brief]',
      '',
      '## RESPUESTA DE HERMES (negocio)',
      hermesOutput || '[HERMES no fue consultado para este brief]',
      '',
      '## RESPUESTA DE APOLO (marketing)',
      apoloOutput || '[APOLO no fue consultado para este brief]',
      '',
      '## TU TAREA',
      'Sintetiza estas perspectivas siguiendo el formato definido en tu system prompt.',
    ].join('\n');

    return this.anthropic.complete({
      systemPrompt: ZEUS_SYNTHESIS_PROMPT,
      userMessage,
      agentName: 'ZEUS-synth',
      maxTokens: 4096,
    });
  }
}
