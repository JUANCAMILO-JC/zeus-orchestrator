import { NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { AgenticTurnResult } from './agentic-orchestrator.service';

function makeTurn(overrides: Partial<AgenticTurnResult> = {}): AgenticTurnResult {
  return {
    messages: [{ role: 'assistant', content: 'historial actualizado' }] as never,
    synthesis: 'síntesis del turno',
    consultations: [],
    iterations: 1,
    usage: { inputTokens: 10, outputTokens: 20 },
    ...overrides,
  };
}

describe('SessionsService', () => {
  let agentic: { runTurn: jest.Mock };
  let store: { save: jest.Mock; get: jest.Mock; list: jest.Mock };
  let service: SessionsService;

  beforeEach(() => {
    agentic = { runTurn: jest.fn().mockResolvedValue(makeTurn()) };
    store = {
      save: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      list: jest.fn().mockResolvedValue([]),
    };
    service = new SessionsService(agentic as never, store as never);
  });

  describe('createSession', () => {
    it('corre el primer turno con el brief como único mensaje', async () => {
      const session = await service.createSession('un brief inicial');

      expect(agentic.runTurn).toHaveBeenCalledTimes(1);
      const [messages] = agentic.runTurn.mock.calls[0];
      expect(messages).toEqual([
        { role: 'user', content: 'BRIEF DEL USUARIO:\n\nun brief inicial' },
      ]);

      expect(session.brief).toBe('un brief inicial');
      expect(session.turns).toHaveLength(2);
      expect(session.turns[0]).toMatchObject({ role: 'user', text: 'un brief inicial' });
      expect(session.turns[1]).toMatchObject({ role: 'assistant', text: 'síntesis del turno' });
      expect(session.messages).toEqual([{ role: 'assistant', content: 'historial actualizado' }]);
      expect(store.save).toHaveBeenCalledWith(session);
    });

    it('propaga los eventos del loop agéntico al listener', async () => {
      const events: unknown[] = [];
      agentic.runTurn.mockImplementation(async (_messages, onEvent) => {
        onEvent?.({ type: 'iteration', iteration: 1 });
        return makeTurn();
      });

      await service.createSession('brief', (e) => events.push(e));

      expect(events).toEqual([{ type: 'iteration', iteration: 1 }]);
    });
  });

  describe('sendMessage', () => {
    it('lanza NotFoundException si la sesión no existe', async () => {
      store.get.mockResolvedValue(null);
      await expect(service.sendMessage('no-existe', 'hola')).rejects.toThrow(
        NotFoundException,
      );
      expect(agentic.runTurn).not.toHaveBeenCalled();
    });

    it('anexa el mensaje al historial existente y actualiza la sesión', async () => {
      const existing = {
        id: 's1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        brief: 'brief original',
        messages: [
          { role: 'user', content: 'BRIEF DEL USUARIO:\n\nbrief original' },
          { role: 'assistant', content: 'primera síntesis' },
        ],
        turns: [
          { role: 'user' as const, text: 'brief original', createdAt: '2026-01-01T00:00:00.000Z' },
          {
            role: 'assistant' as const,
            text: 'primera síntesis',
            consultations: [],
            createdAt: '2026-01-01T00:00:01.000Z',
          },
        ],
      };
      store.get.mockResolvedValue(existing);
      // `existing` es la misma referencia que el servicio muta en sitio
      // (session.messages = turn.messages, session.updatedAt = ...), así
      // que hay que capturar el estado original antes de llamar, no
      // leerlo después — para entonces ya fue sobrescrito.
      const originalMessages = [...existing.messages];
      const originalUpdatedAt = existing.updatedAt;
      agentic.runTurn.mockResolvedValue(
        makeTurn({ synthesis: 'segunda respuesta', consultations: [{ tool: 'consult_atlas', query: 'q', elapsedMs: 5 }] }),
      );

      const session = await service.sendMessage('s1', '¿y si el presupuesto fuera $500?');

      const [messages] = agentic.runTurn.mock.calls[0];
      expect(messages).toEqual([
        ...originalMessages,
        { role: 'user', content: '¿y si el presupuesto fuera $500?' },
      ]);

      expect(session.turns).toHaveLength(4);
      expect(session.turns[2]).toMatchObject({
        role: 'user',
        text: '¿y si el presupuesto fuera $500?',
      });
      expect(session.turns[3]).toMatchObject({
        role: 'assistant',
        text: 'segunda respuesta',
        consultations: [{ tool: 'consult_atlas', query: 'q', elapsedMs: 5 }],
      });
      expect(session.updatedAt).not.toBe(originalUpdatedAt);
      expect(store.save).toHaveBeenCalledWith(session);
    });
  });

  describe('get', () => {
    it('lanza NotFoundException si no existe', async () => {
      store.get.mockResolvedValue(null);
      await expect(service.get('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('devuelve la sesión si existe', async () => {
      const existing = { id: 's1' };
      store.get.mockResolvedValue(existing);
      await expect(service.get('s1')).resolves.toBe(existing);
    });
  });
});
