import { Injectable } from '@nestjs/common';
import { AnthropicService } from '../anthropic/anthropic.service';
import { HERMES_SYSTEM_PROMPT } from './hermes.prompt';

@Injectable()
export class HermesService {
  constructor(private readonly anthropic: AnthropicService) {}

  async consult(query: string): Promise<string> {
    return this.anthropic.complete({
      systemPrompt: HERMES_SYSTEM_PROMPT,
      userMessage: query,
      agentName: 'HERMES',
    });
  }
}
