import { OrchestratorService, PhaseEvent } from './orchestrator.service';
import { DecompositionResult } from '../agents/zeus.service';

describe('OrchestratorService', () => {
  const decomposition: DecompositionResult = {
    analysis: 'Un problema de stack, de pricing y de adquisición',
    dimensions: { technical: ['stack'], business: ['pricing'], marketing: ['adquisición'] },
    queries: { atlas: 'query técnica', hermes: 'query de negocio', apolo: 'query de marketing' },
  };

  let zeus: { decompose: jest.Mock; synthesize: jest.Mock };
  let atlas: { consult: jest.Mock };
  let hermes: { consult: jest.Mock };
  let apolo: { consult: jest.Mock };
  let store: { save: jest.Mock };
  let service: OrchestratorService;

  beforeEach(() => {
    zeus = {
      decompose: jest.fn().mockResolvedValue(decomposition),
      synthesize: jest.fn().mockResolvedValue('síntesis final'),
    };
    atlas = { consult: jest.fn().mockResolvedValue('output de atlas') };
    hermes = { consult: jest.fn().mockResolvedValue('output de hermes') };
    apolo = { consult: jest.fn().mockResolvedValue('output de apolo') };
    store = { save: jest.fn().mockResolvedValue(undefined) };
    service = new OrchestratorService(
      zeus as never,
      atlas as never,
      hermes as never,
      apolo as never,
      store as never,
    );
  });

  it('ejecuta las 3 fases y persiste el resultado', async () => {
    const result = await service.orchestrate('un brief cualquiera');

    expect(atlas.consult).toHaveBeenCalledWith('query técnica');
    expect(hermes.consult).toHaveBeenCalledWith('query de negocio');
    expect(apolo.consult).toHaveBeenCalledWith('query de marketing');
    expect(zeus.synthesize).toHaveBeenCalledWith({
      brief: 'un brief cualquiera',
      atlasOutput: 'output de atlas',
      hermesOutput: 'output de hermes',
      apoloOutput: 'output de apolo',
    });
    expect(result.synthesis).toBe('síntesis final');
    expect(result.errors).toBeNull();
    expect(result.fromCache).toBe(false);
    expect(result.id).toBeTruthy();
    expect(store.save).toHaveBeenCalledTimes(1);
  });

  it('si un arquitecto falla, continúa sin él y registra el error', async () => {
    atlas.consult.mockRejectedValue(new Error('rate limited'));

    const result = await service.orchestrate('otro brief');

    expect(result.atlasOutput).toBeNull();
    expect(result.hermesOutput).toBe('output de hermes');
    expect(result.errors).toEqual({ atlas: 'rate limited' });
    expect(zeus.synthesize).toHaveBeenCalledWith(
      expect.objectContaining({ atlasOutput: null, hermesOutput: 'output de hermes' }),
    );
  });

  it('si todos los arquitectos consultados fallan, lanza error', async () => {
    atlas.consult.mockRejectedValue(new Error('boom atlas'));
    hermes.consult.mockRejectedValue(new Error('boom hermes'));
    apolo.consult.mockRejectedValue(new Error('boom apolo'));

    await expect(service.orchestrate('brief condenado')).rejects.toThrow(
      /All consulted architects failed/,
    );
    expect(zeus.synthesize).not.toHaveBeenCalled();
  });

  it('omite a un arquitecto cuando su query es null', async () => {
    zeus.decompose.mockResolvedValue({
      ...decomposition,
      queries: { atlas: 'query técnica', hermes: null, apolo: null },
    });

    const result = await service.orchestrate('brief puramente técnico');

    expect(hermes.consult).not.toHaveBeenCalled();
    expect(apolo.consult).not.toHaveBeenCalled();
    expect(result.hermesOutput).toBeNull();
    expect(result.apoloOutput).toBeNull();
    expect(result.errors).toBeNull();
  });

  it('devuelve el resultado cacheado para el mismo brief sin re-ejecutar', async () => {
    const first = await service.orchestrate('brief repetido');
    const second = await service.orchestrate('  BRIEF REPETIDO  ');

    expect(zeus.decompose).toHaveBeenCalledTimes(1);
    expect(second.fromCache).toBe(true);
    expect(second.id).toBe(first.id);
  });

  it('no cachea resultados degradados', async () => {
    atlas.consult.mockRejectedValueOnce(new Error('fallo transitorio'));

    const first = await service.orchestrate('brief inestable');
    expect(first.errors).toEqual({ atlas: 'fallo transitorio' });

    const second = await service.orchestrate('brief inestable');
    expect(second.fromCache).toBe(false);
    expect(zeus.decompose).toHaveBeenCalledTimes(2);
  });

  it('emite eventos de fase en orden', async () => {
    const events: PhaseEvent[] = [];
    await service.orchestrate('brief con listener', (e) => events.push(e));

    const sequence = events.map((e) => `${e.phase}:${e.status}`);
    expect(sequence[0]).toBe('decomposition:start');
    expect(sequence[1]).toBe('decomposition:complete');
    expect(sequence).toContain('atlas:complete');
    expect(sequence).toContain('hermes:complete');
    expect(sequence).toContain('apolo:complete');
    expect(sequence[sequence.length - 1]).toBe('synthesis:complete');
  });

  it('un listener que lanza no tumba la orquestación', async () => {
    const result = await service.orchestrate('brief con listener roto', () => {
      throw new Error('listener roto');
    });
    expect(result.synthesis).toBe('síntesis final');
  });

  it('la persistencia fallida no tumba la orquestación', async () => {
    store.save.mockRejectedValue(new Error('disk full'));
    const result = await service.orchestrate('brief sin disco');
    expect(result.synthesis).toBe('síntesis final');
  });
});
