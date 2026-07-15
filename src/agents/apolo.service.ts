import { Injectable } from '@nestjs/common';
import { AnthropicService } from '../anthropic/anthropic.service';
import { APOLO_SYSTEM_PROMPT } from './apolo.prompt';

@Injectable()
export class ApoloService {
  constructor(private readonly anthropic: AnthropicService) {}

  async consult(query: string): Promise<string> {
    return this.anthropic.complete({
      systemPrompt: APOLO_SYSTEM_PROMPT,
      userMessage: query,
      agentName: 'APOLO',
    });
  }
}
