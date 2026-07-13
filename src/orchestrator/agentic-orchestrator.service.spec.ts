import {
  AgenticOrchestratorService,
  AgenticEvent,
} from './agentic-orchestrator.service';

interface FakeMessage {
  content: any[];
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

function makeMessage(
  content: any[],
  stopReason = 'end_turn',
  usage = { input_tokens: 100, output_tokens: 50 },
): FakeMessage {
  return { content, stop_reason: stopReason, usage };
}

/**
 * Runner falso: itera los mensajes dados, registra pushMessages y expone
 * `.params.messages` como el runner real (historial acumulado que el
 * servicio persiste para continuar la conversación en otro turno).
 */
function makeFakeRunner(
  messages: FakeMessage[],
  finalHistory: any[] = [{ role: 'assistant', content: 'historial-simulado' }],
) {
  const pushed: any[] = [];
  return {
    pushed,
    pushMessages: (...msgs: any[]) => pushed.push(...msgs),
    params: { messages: finalHistory },
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
  let store: { save: jest.Mock };
  let service: AgenticOrchestratorService;

  beforeEach(() => {
    toolRunnerMock = jest.fn();
    anthropic = {
      modelId: 'claude-test',
      sdk: { beta: { messages: { toolRunner: toolRunnerMock } } },
    };
    atlas = { consult: jest.fn().mockResolvedValue('output de atlas') };
    hermes = { consult: jest.fn().mockResolvedValue('output de hermes') };
    store = { save: jest.fn().mockResolvedValue(undefined) };
    service = new AgenticOrchestratorService(
      anthropic,
      atlas as never,
      hermes as never,
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

  it('configura el runner con las 3 tools y el modelo correcto', async () => {
    toolRunnerMock.mockReturnValue(
      makeFakeRunner([makeMessage([{ type: 'text', text: 'ok' }])]),
    );

    await service.orchestrate('brief');

    const params = toolRunnerMock.mock.calls[0][0];
    expect(params.model).toBe('claude-test');
    expect(params.max_iterations).toBe(8);
    const toolNames = params.tools.map((t: any) => t.name);
    expect(toolNames).toEqual(['consult_atlas', 'consult_hermes', 'web_search']);
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
});
