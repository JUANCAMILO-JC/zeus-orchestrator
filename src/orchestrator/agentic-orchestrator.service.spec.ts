import {
  AgenticOrchestratorService,
  AgenticEvent,
} from './agentic-orchestrator.service';

interface FakeMessage {
  content: any[];
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
  container?: { id: string } | null;
}

function makeMessage(
  content: any[],
  stopReason = 'end_turn',
  usage = { input_tokens: 100, output_tokens: 50 },
  container: { id: string } | null = null,
): FakeMessage {
  return { content, stop_reason: stopReason, usage, container };
}

/**
 * Runner falso: itera los mensajes dados, registra pushMessages y
 * setMessagesParams, y expone `.params.messages` como el runner real
 * (historial acumulado que el servicio persiste para continuar la
 * conversación en otro turno).
 */
function makeFakeRunner(
  messages: FakeMessage[],
  finalHistory: any[] = [{ role: 'assistant', content: 'historial-simulado' }],
) {
  const pushed: any[] = [];
  const setParamsCalls: any[] = [];
  const params: any = { messages: finalHistory };
  return {
    pushed,
    setParamsCalls,
    params,
    pushMessages: (...msgs: any[]) => pushed.push(...msgs),
    setMessagesParams: (paramsOrMutator: any) => {
      const next =
        typeof paramsOrMutator === 'function' ? paramsOrMutator(params) : paramsOrMutator;
      Object.assign(params, next);
      setParamsCalls.push(next);
    },
    async *[Symbol.asyncIterator]() {
      for (const m of messages) {
        yield m;
      }
    },
  };
}

describe('AgenticOrchestratorService', () => {
  let toolRunnerMock: jest.Mock;
  let anthropic: any;
  let atlas: { consult: jest.Mock };
  let hermes: { consult: jest.Mock };
  let apolo: { consult: jest.Mock };
  let store: { save: jest.Mock };
  let service: AgenticOrchestratorService;

  beforeEach(() => {
    toolRunnerMock = jest.fn();
    anthropic = {
      modelId: 'claude-test',
      compactionTriggerTokens: 150_000,
      sdk: { beta: { messages: { toolRunner: toolRunnerMock } } },
    };
    atlas = { consult: jest.fn().mockResolvedValue('output de atlas') };
    hermes = { consult: jest.fn().mockResolvedValue('output de hermes') };
    apolo = { consult: jest.fn().mockResolvedValue('output de apolo') };
    store = { save: jest.fn().mockResolvedValue(undefined) };
    service = new AgenticOrchestratorService(
      anthropic,
      atlas as never,
      hermes as never,
      apolo as never,
      store as never,
    );
  });

  it('devuelve la síntesis del mensaje final y persiste el resultado', async () => {
    toolRunnerMock.mockReturnValue(
      makeFakeRunner([
        makeMessage([{ type: 'tool_use', name: 'consult_atlas', input: { query: 'q' } }], 'tool_use'),
        makeMessage([{ type: 'text', text: 'síntesis agéntica' }]),
      ]),
    );

    const result = await service.orchestrate('un brief agéntico');

    expect(result.synthesis).toBe('síntesis agéntica');
    expect(result.mode).toBe('agentic');
    expect(result.iterations).toBe(2);
    expect(result.metrics.inputTokens).toBe(200);
    expect(result.metrics.outputTokens).toBe(100);
    expect(store.save).toHaveBeenCalledTimes(1);
  });

  it('configura el runner con las 4 tools y el modelo correcto', async () => {
    toolRunnerMock.mockReturnValue(
      makeFakeRunner([makeMessage([{ type: 'text', text: 'ok' }])]),
    );

    await service.orchestrate('brief');

    const params = toolRunnerMock.mock.calls[0][0];
    expect(params.model).toBe('claude-test');
    expect(params.max_iterations).toBe(8);
    const toolNames = params.tools.map((t: any) => t.name);
    expect(toolNames).toEqual(['consult_atlas', 'consult_hermes', 'consult_apolo', 'web_search']);
  });

  it('las tools de arquitecto ejecutan la consulta y la registran', async () => {
    toolRunnerMock.mockReturnValue(
      makeFakeRunner([makeMessage([{ type: 'text', text: 'ok' }])]),
    );
    const events: AgenticEvent[] = [];

    await service.orchestrate('brief', (e) => events.push(e));

    // Ejecuta manualmente la tool que el servicio le pasó al runner,
    // como haría el runner real al recibir un tool_use.
    const atlasTool = toolRunnerMock.mock.calls[0][0].tools[0];
    const output = await atlasTool.run({ query: 'query autocontenida' });

    expect(output).toBe('output de atlas');
    expect(atlas.consult).toHaveBeenCalledWith('query autocontenida');
    expect(events.some((e) => e.type === 'tool_call' && e.tool === 'consult_atlas')).toBe(true);
    expect(events.some((e) => e.type === 'tool_result' && e.tool === 'consult_atlas')).toBe(true);
  });

  it('la tool de apolo consulta al arquitecto de marketing', async () => {
    toolRunnerMock.mockReturnValue(
      makeFakeRunner([makeMessage([{ type: 'text', text: 'ok' }])]),
    );

    await service.orchestrate('brief');
    const apoloTool = toolRunnerMock.mock.calls[0][0].tools[2];
    const output = await apoloTool.run({ query: 'query de marketing' });

    expect(output).toBe('output de apolo');
    expect(apolo.consult).toHaveBeenCalledWith('query de marketing');
  });

  it('si un arquitecto falla, la tool devuelve el error como texto para que ZEUS se adapte', async () => {
    toolRunnerMock.mockReturnValue(
      makeFakeRunner([makeMessage([{ type: 'text', text: 'ok' }])]),
    );
    hermes.consult.mockRejectedValue(new Error('rate limited'));

    await service.orchestrate('brief');
    const hermesTool = toolRunnerMock.mock.calls[0][0].tools[1];
    const output = await hermesTool.run({ query: 'q' });

    expect(output).toContain('ERROR');
    expect(output).toContain('rate limited');
  });

  it('reanuda el loop ante pause_turn devolviendo el turno del asistente', async () => {
    const paused = makeMessage(
      [{ type: 'server_tool_use', name: 'web_search', input: { query: 'precios' } }],
      'pause_turn',
    );
    const runner = makeFakeRunner([paused, makeMessage([{ type: 'text', text: 'fin' }])]);
    toolRunnerMock.mockReturnValue(runner);

    const result = await service.orchestrate('brief');

    expect(runner.pushed).toEqual([{ role: 'assistant', content: paused.content }]);
    expect(result.synthesis).toBe('fin');
    expect(result.consultations).toEqual([
      { tool: 'web_search', query: 'precios', elapsedMs: 0 },
    ]);
  });

  it('lanza error si el loop termina sin síntesis', async () => {
    toolRunnerMock.mockReturnValue(
      makeFakeRunner([
        makeMessage([{ type: 'tool_use', name: 'consult_atlas', input: {} }], 'tool_use'),
      ]),
    );

    await expect(service.orchestrate('brief')).rejects.toThrow(/without a synthesis/);
  });

  it('emite eventos de iteración y comentario', async () => {
    toolRunnerMock.mockReturnValue(
      makeFakeRunner([
        makeMessage([{ type: 'text', text: 'voy a consultar a ambos' }], 'tool_use'),
        makeMessage([{ type: 'text', text: 'síntesis' }]),
      ]),
    );
    const events: AgenticEvent[] = [];

    await service.orchestrate('brief', (e) => events.push(e));

    expect(events.filter((e) => e.type === 'iteration')).toHaveLength(2);
    expect(events.some((e) => e.type === 'commentary' && e.text === 'voy a consultar a ambos')).toBe(true);
  });

  describe('compactación de contexto', () => {
    it('configura el runner con la beta y el context_management correctos', async () => {
      toolRunnerMock.mockReturnValue(
        makeFakeRunner([makeMessage([{ type: 'text', text: 'ok' }])]),
      );

      await service.orchestrate('brief');

      const params = toolRunnerMock.mock.calls[0][0];
      expect(params.betas).toEqual(['compact-2026-01-12']);
      expect(params.context_management).toEqual({
        edits: [
          {
            type: 'compact_20260112',
            pause_after_compaction: false,
            trigger: { type: 'input_tokens', value: 150_000 },
            instructions: expect.any(String),
          },
        ],
      });
    });

    it('usa el umbral configurado en AnthropicService.compactionTriggerTokens', async () => {
      anthropic.compactionTriggerTokens = 5_000;
      toolRunnerMock.mockReturnValue(
        makeFakeRunner([makeMessage([{ type: 'text', text: 'ok' }])]),
      );

      await service.orchestrate('brief');

      const params = toolRunnerMock.mock.calls[0][0];
      expect(params.context_management.edits[0].trigger).toEqual({
        type: 'input_tokens',
        value: 5_000,
      });
    });

    it('emite un evento compaction cuando el mensaje trae un bloque de compactación exitoso', async () => {
      toolRunnerMock.mockReturnValue(
        makeFakeRunner([
          makeMessage([
            { type: 'compaction', content: 'resumen de lo compactado', encrypted_content: 'meta' },
            { type: 'text', text: 'síntesis' },
          ]),
        ]),
      );
      const events: AgenticEvent[] = [];

      await service.orchestrate('brief', (e) => events.push(e));

      expect(events).toContainEqual({ type: 'compaction', iteration: 1, succeeded: true });
    });

    it('emite succeeded:false si la compactación falló (content null)', async () => {
      toolRunnerMock.mockReturnValue(
        makeFakeRunner([
          makeMessage([
            { type: 'compaction', content: null, encrypted_content: null },
            { type: 'text', text: 'síntesis' },
          ]),
        ]),
      );
      const events: AgenticEvent[] = [];

      await service.orchestrate('brief', (e) => events.push(e));

      expect(events).toContainEqual({ type: 'compaction', iteration: 1, succeeded: false });
    });

    it('reanuda el loop si el servidor pausa con stop_reason compaction', async () => {
      const paused = makeMessage(
        [{ type: 'compaction', content: 'resumen parcial', encrypted_content: 'meta' }],
        'compaction',
      );
      const runner = makeFakeRunner([paused, makeMessage([{ type: 'text', text: 'fin' }])]);
      toolRunnerMock.mockReturnValue(runner);

      const result = await service.orchestrate('brief');

      expect(runner.pushed).toEqual([{ role: 'assistant', content: paused.content }]);
      expect(result.synthesis).toBe('fin');
    });
  });

  describe('container de web_search con filtrado dinámico', () => {
    // Reproduce el bug real encontrado en pruebas en vivo: cuando
    // web_search deja trabajo pendiente en su container de ejecución de
    // código, la siguiente request interna del tool runner debe reenviar
    // ese container id o la API responde 400
    // ("container_id is required when there are pending tool uses...").
    it('reenvía el container id en la siguiente llamada interna cuando el mensaje lo trae', async () => {
      const withPendingContainer = makeMessage(
        [{ type: 'server_tool_use', name: 'web_search', input: { query: 'precios competidores' } }],
        'tool_use',
        { input_tokens: 100, output_tokens: 50 },
        { id: 'container_abc123' },
      );
      const runner = makeFakeRunner([
        withPendingContainer,
        makeMessage([{ type: 'text', text: 'síntesis' }]),
      ]);
      toolRunnerMock.mockReturnValue(runner);

      await service.orchestrate('brief');

      expect(runner.setParamsCalls).toHaveLength(1);
      expect(runner.setParamsCalls[0]).toMatchObject({ container: 'container_abc123' });
      expect(runner.params.container).toBe('container_abc123');
    });

    it('no llama a setMessagesParams si el mensaje no trae container', async () => {
      toolRunnerMock.mockReturnValue(
        makeFakeRunner([makeMessage([{ type: 'text', text: 'ok' }])]),
      );

      await service.orchestrate('brief');

      const runner = toolRunnerMock.mock.results[0].value;
      expect(runner.setParamsCalls).toEqual([]);
    });
  });
});
