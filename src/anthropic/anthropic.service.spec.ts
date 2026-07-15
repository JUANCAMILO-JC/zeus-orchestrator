import { ConfigService } from '@nestjs/config';
import { AnthropicService } from './anthropic.service';

const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    status?: number;
  }
  class MockAnthropic {
    static APIError = APIError;
    messages = { create: mockCreate };
  }
  return { __esModule: true, default: MockAnthropic };
});

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function makeResponse(text: string, stopReason = 'end_turn') {
  return {
    content: [{ type: 'text', text }],
    usage: { input_tokens: 10, output_tokens: 20 },
    stop_reason: stopReason,
  };
}

describe('AnthropicService', () => {
  let service: AnthropicService;

  beforeEach(() => {
    mockCreate.mockReset();
    service = new AnthropicService(
      makeConfig({ ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_MODEL: 'claude-test' }),
    );
  });

  it('lanza error si falta ANTHROPIC_API_KEY', () => {
    expect(() => new AnthropicService(makeConfig({}))).toThrow(
      'ANTHROPIC_API_KEY is not set',
    );
  });

  describe('compactionTriggerTokens', () => {
    it('usa 150k por defecto si no está configurado', () => {
      expect(service.compactionTriggerTokens).toBe(150_000);
    });

    it('usa el valor configurado si es válido y cumple el mínimo de la API', () => {
      const s = new AnthropicService(
        makeConfig({ ANTHROPIC_API_KEY: 'k', COMPACTION_TRIGGER_TOKENS: '80000' }),
      );
      expect(s.compactionTriggerTokens).toBe(80_000);
    });

    it('sube al piso de 50k si el valor configurado está por debajo (la API lo rechaza)', () => {
      const s = new AnthropicService(
        makeConfig({ ANTHROPIC_API_KEY: 'k', COMPACTION_TRIGGER_TOKENS: '3000' }),
      );
      expect(s.compactionTriggerTokens).toBe(50_000);
    });

    it('ignora valores no numéricos y usa el default', () => {
      const s = new AnthropicService(
        makeConfig({ ANTHROPIC_API_KEY: 'k', COMPACTION_TRIGGER_TOKENS: 'no-es-un-numero' }),
      );
      expect(s.compactionTriggerTokens).toBe(150_000);
    });
  });

  describe('complete', () => {
    it('devuelve el texto de la respuesta', async () => {
      mockCreate.mockResolvedValue(makeResponse('hola'));
      await expect(
        service.complete({ systemPrompt: 'sys', userMessage: 'msg' }),
      ).resolves.toBe('hola');
    });

    it('lanza error si el modelo rechaza la petición (refusal)', async () => {
      mockCreate.mockResolvedValue(makeResponse('', 'refusal'));
      await expect(
        service.complete({ systemPrompt: 'sys', userMessage: 'msg' }),
      ).rejects.toThrow(/refused/);
    });

    it('lanza error si no hay bloque de texto', async () => {
      mockCreate.mockResolvedValue({
        content: [],
        usage: { input_tokens: 1, output_tokens: 1 },
        stop_reason: 'end_turn',
      });
      await expect(
        service.complete({ systemPrompt: 'sys', userMessage: 'msg' }),
      ).rejects.toThrow(/No text content/);
    });
  });

  describe('completeJson', () => {
    it('parsea JSON envuelto en code fences y texto alrededor', async () => {
      mockCreate.mockResolvedValue(
        makeResponse('Aquí tienes:\n```json\n{"a": 1}\n```\n¡Listo!'),
      );
      await expect(
        service.completeJson({ systemPrompt: 'sys', userMessage: 'msg' }),
      ).resolves.toEqual({ a: 1 });
    });

    it('reintenta una vez con instrucción correctiva si el JSON es inválido', async () => {
      mockCreate
        .mockResolvedValueOnce(makeResponse('esto no es json'))
        .mockResolvedValueOnce(makeResponse('{"ok": true}'));

      const result = await service.completeJson({
        systemPrompt: 'sys',
        userMessage: 'msg original',
      });

      expect(result).toEqual({ ok: true });
      expect(mockCreate).toHaveBeenCalledTimes(2);
      const secondCall = mockCreate.mock.calls[1][0];
      expect(secondCall.messages[0].content).toContain('msg original');
      expect(secondCall.messages[0].content).toContain('no fue un JSON válido');
    });

    it('reintenta si la validación estructural falla', async () => {
      mockCreate
        .mockResolvedValueOnce(makeResponse('{"wrong": true}'))
        .mockResolvedValueOnce(makeResponse('{"right": true}'));

      const result = await service.completeJson({
        systemPrompt: 'sys',
        userMessage: 'msg',
        validate: (v: any) => (v.right ? null : 'falta el campo "right"'),
      });

      expect(result).toEqual({ right: true });
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('lanza error tras agotar los reintentos', async () => {
      mockCreate.mockResolvedValue(makeResponse('nunca es json'));
      await expect(
        service.completeJson({ systemPrompt: 'sys', userMessage: 'msg' }),
      ).rejects.toThrow(/Invalid JSON after 2 attempts/);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });
});
