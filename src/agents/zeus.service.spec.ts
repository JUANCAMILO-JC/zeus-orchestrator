import { ZeusService, validateDecomposition } from './zeus.service';

describe('validateDecomposition', () => {
  const valid = {
    analysis: 'núcleo del problema',
    dimensions: { technical: ['a'], business: ['b'], marketing: ['c'] },
    queries: {
      atlas: 'pregunta técnica',
      hermes: 'pregunta de negocio',
      apolo: 'pregunta de marketing',
    },
  };

  it('acepta una decomposición válida', () => {
    expect(validateDecomposition(valid)).toBeNull();
  });

  it('acepta queries null individuales', () => {
    expect(
      validateDecomposition({
        ...valid,
        queries: { atlas: 'q', hermes: null, apolo: null },
      }),
    ).toBeNull();
  });

  it('rechaza no-objetos', () => {
    expect(validateDecomposition(null)).toMatch(/no es un objeto/);
    expect(validateDecomposition('texto')).toMatch(/no es un objeto/);
  });

  it('rechaza si falta analysis', () => {
    expect(validateDecomposition({ queries: valid.queries })).toMatch(/analysis/);
  });

  it('rechaza si falta queries', () => {
    expect(validateDecomposition({ analysis: 'x' })).toMatch(/queries/);
  });

  it('rechaza queries con tipo incorrecto', () => {
    expect(
      validateDecomposition({ ...valid, queries: { atlas: 42, hermes: 'q', apolo: null } }),
    ).toMatch(/queries.atlas/);
  });

  it('rechaza si todas las queries son null', () => {
    expect(
      validateDecomposition({
        ...valid,
        queries: { atlas: null, hermes: null, apolo: null },
      }),
    ).toMatch(/al menos un arquitecto/);
  });
});

describe('ZeusService.decompose', () => {
  it('normaliza dimensions y queries faltantes', async () => {
    const anthropic = {
      completeJson: jest.fn().mockResolvedValue({
        analysis: 'análisis',
        queries: { atlas: 'q' },
      }),
    };
    const service = new ZeusService(anthropic as never);

    const result = await service.decompose('brief');

    expect(result.dimensions).toEqual({ technical: [], business: [], marketing: [] });
    expect(result.queries).toEqual({ atlas: 'q', hermes: null, apolo: null });
    expect(anthropic.completeJson).toHaveBeenCalledWith(
      expect.objectContaining({ validate: validateDecomposition }),
    );
  });
});
