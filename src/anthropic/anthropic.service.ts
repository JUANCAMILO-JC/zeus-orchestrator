import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    this.client = new Anthropic({ apiKey });
    this.model = this.config.get<string>('ANTHROPIC_MODEL') || 'claude-opus-4-5';
  }

  /**
   * Llama al modelo con un system prompt y un mensaje de usuario.
   * Devuelve el texto plano de la respuesta.
   */
  async complete(params: {
    systemPrompt: string;
    userMessage: string;
    maxTokens?: number;
    agentName?: string;
  }): Promise<string> {
    const { systemPrompt, userMessage, maxTokens = 4096, agentName = 'agent' } = params;

    this.logger.log(`[${agentName}] Calling ${this.model}...`);
    const start = Date.now();

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const elapsed = Date.now() - start;
    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;
    this.logger.log(
      `[${agentName}] Done in ${elapsed}ms · in:${tokensIn} out:${tokensOut} tokens`
    );

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error(`[${agentName}] No text content in response`);
    }
    return textBlock.text;
  }

  /**
   * Llama al modelo y parsea la respuesta como JSON.
   * Útil para el modo Decomposición de ZEUS.
   */
  async completeJson<T>(params: {
    systemPrompt: string;
    userMessage: string;
    maxTokens?: number;
    agentName?: string;
  }): Promise<T> {
    const raw = await this.complete(params);
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch (err) {
      this.logger.error(`Failed to parse JSON from ${params.agentName}: ${cleaned}`);
      throw new Error(`Invalid JSON from ${params.agentName}: ${err.message}`);
    }
  }
}
