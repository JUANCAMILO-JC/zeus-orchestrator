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
    this.model = this.config.get<string>('ANTHROPIC_MODEL') || 'claude-opus-4-8';
  }

  /** Cliente crudo del SDK, para features que van más allá de complete() (ej. tool runner). */
  get sdk(): Anthropic {
    return this.client;
  }

  /** Modelo configurado para todos los agentes. */
  get modelId(): string {
    return this.model;
  }

  /**
   * Umbral de input tokens a partir del cual el servidor compacta
   * automáticamente el historial de una conversación larga (ver
   * `context_management` en AgenticOrchestratorService). Configurable vía
   * COMPACTION_TRIGGER_TOKENS para pruebas o tuning; por defecto coincide
   * con el default de la API (150k). La API rechaza valores por debajo de
   * 50k (`trigger.value must be at least 50000`), así que un valor
   * inválido o demasiado bajo cae a ese piso en vez de tumbar la request.
   */
  get compactionTriggerTokens(): number {
    const MIN_TRIGGER_TOKENS = 50_000;
    const raw = this.config.get<string>('COMPACTION_TRIGGER_TOKENS');
    const parsed = raw ? Number(raw) : NaN;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 150_000;
    }
    return Math.max(parsed, MIN_TRIGGER_TOKENS);
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

    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        this.logger.error(
          `[${agentName}] API error ${err.status ?? 'conn'}: ${err.message}`,
        );
      }
      throw err;
    }

    const elapsed = Date.now() - start;
    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;
    this.logger.log(
      `[${agentName}] Done in ${elapsed}ms · in:${tokensIn} out:${tokensOut} tokens · stop:${response.stop_reason}`,
    );

    if (response.stop_reason === 'refusal') {
      throw new Error(`[${agentName}] The model refused to answer this request`);
    }
    if (response.stop_reason === 'max_tokens') {
      this.logger.warn(
        `[${agentName}] Response truncated at max_tokens=${maxTokens} — consider raising it`,
      );
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error(`[${agentName}] No text content in response`);
    }
    return textBlock.text;
  }

  /**
   * Llama al modelo y parsea la respuesta como JSON, con validación
   * estructural opcional y un reintento correctivo si el modelo
   * devuelve JSON inválido. Útil para el modo Decomposición de ZEUS.
   */
  async completeJson<T>(params: {
    systemPrompt: string;
    userMessage: string;
    maxTokens?: number;
    agentName?: string;
    /** Devuelve un mensaje de error si la estructura es inválida, o null si es válida. */
    validate?: (value: unknown) => string | null;
  }): Promise<T> {
    const { validate, ...completeParams } = params;
    const agentName = params.agentName ?? 'agent';
    const maxAttempts = 2;
    let userMessage = params.userMessage;
    let lastError = '';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const raw = await this.complete({ ...completeParams, userMessage });

      let parsed: unknown;
      try {
        parsed = JSON.parse(this.extractJson(raw));
        const validationError = validate ? validate(parsed) : null;
        if (!validationError) {
          return parsed as T;
        }
        lastError = validationError;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      this.logger.warn(
        `[${agentName}] Attempt ${attempt}/${maxAttempts} returned invalid JSON (${lastError})`,
      );
      userMessage =
        `${params.userMessage}\n\n` +
        `IMPORTANTE: tu respuesta anterior no fue un JSON válido (${lastError}). ` +
        `Responde ÚNICAMENTE con el objeto JSON pedido, sin texto adicional ni code fences.`;
    }

    throw new Error(
      `[${agentName}] Invalid JSON after ${maxAttempts} attempts: ${lastError}`,
    );
  }

  /**
   * Extrae el objeto JSON de una respuesta que puede venir envuelta en
   * code fences o con texto alrededor.
   */
  private extractJson(raw: string): string {
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
      throw new Error('no JSON object found in response');
    }
    return cleaned.slice(start, end + 1);
  }
}
