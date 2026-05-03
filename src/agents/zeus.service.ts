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
  };
  queries: {
    atlas: string | null;
    hermes: string | null;
  };
}

@Injectable()
export class ZeusService {
  constructor(private readonly anthropic: AnthropicService) {}

  /**
   * Modo 1: descompone el brief en consultas para cada arquitecto.
   */
  async decompose(brief: string): Promise<DecompositionResult> {
    return this.anthropic.completeJson<DecompositionResult>({
      systemPrompt: ZEUS_DECOMPOSITION_PROMPT,
      userMessage: `BRIEF DEL USUARIO:\n\n${brief}`,
      agentName: 'ZEUS-decompose',
      maxTokens: 2048,
    });
  }

  /**
   * Modo 2: sintetiza los outputs de los arquitectos en una decisión integrada.
   */
  async synthesize(params: {
    brief: string;
    atlasOutput: string | null;
    hermesOutput: string | null;
  }): Promise<string> {
    const { brief, atlasOutput, hermesOutput } = params;

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
