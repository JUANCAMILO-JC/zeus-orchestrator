import { Injectable } from '@nestjs/common';
import { AnthropicService } from '../anthropic/anthropic.service';
import { ATLAS_SYSTEM_PROMPT } from './atlas.prompt';

@Injectable()
export class AtlasService {
  constructor(private readonly anthropic: AnthropicService) {}

  async consult(query: string): Promise<string> {
    return this.anthropic.complete({
      systemPrompt: ATLAS_SYSTEM_PROMPT,
      userMessage: query,
      agentName: 'ATLAS',
    });
  }
}
