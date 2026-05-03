import { Injectable, Logger } from '@nestjs/common';
import { AtlasService } from '../agents/atlas.service';
import { HermesService } from '../agents/hermes.service';
import { ZeusService, DecompositionResult } from '../agents/zeus.service';

export interface OrchestrationResult {
  brief: string;
  decomposition: DecompositionResult;
  atlasOutput: string | null;
  hermesOutput: string | null;
  synthesis: string;
  metrics: {
    totalElapsedMs: number;
    decompositionMs: number;
    parallelExecutionMs: number;
    synthesisMs: number;
  };
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly zeus: ZeusService,
    private readonly atlas: AtlasService,
    private readonly hermes: HermesService,
  ) {}

  /**
   * Flujo: Decomposición → Arquitectos en paralelo → Síntesis
   *
   * Costo aproximado por brief (modelo Sonnet, ~):
   * - Decomposición: ~500 tokens in / ~800 out  ≈ $0.013
   * - ATLAS: ~600 in / ~2000 out                ≈ $0.032
   * - HERMES: ~600 in / ~2000 out               ≈ $0.032
   * - Síntesis: ~5000 in / ~2000 out            ≈ $0.045
   * - Total estimado: ~$0.12 por brief completo
   */
  async orchestrate(brief: string): Promise<OrchestrationResult> {
    const t0 = Date.now();
    this.logger.log('═══ Starting orchestration ═══');

    // FASE 1 — Decomposición
    const tDecompStart = Date.now();
    const decomposition = await this.zeus.decompose(brief);
    const decompositionMs = Date.now() - tDecompStart;
    this.logger.log(
      `Phase 1 (decomposition) done in ${decompositionMs}ms · ` +
      `Atlas needed: ${!!decomposition.queries.atlas} · ` +
      `Hermes needed: ${!!decomposition.queries.hermes}`,
    );

    // FASE 2 — Arquitectos en paralelo
    // Si una query es null, se omite ese arquitecto sin bloquear al otro.
    const tParallelStart = Date.now();
    const [atlasOutput, hermesOutput] = await Promise.all([
      decomposition.queries.atlas
        ? this.atlas.consult(decomposition.queries.atlas)
        : Promise.resolve(null),
      decomposition.queries.hermes
        ? this.hermes.consult(decomposition.queries.hermes)
        : Promise.resolve(null),
    ]);
    const parallelExecutionMs = Date.now() - tParallelStart;
    this.logger.log(`Phase 2 (parallel architects) done in ${parallelExecutionMs}ms`);

    // FASE 3 — Síntesis
    const tSynthStart = Date.now();
    const synthesis = await this.zeus.synthesize({
      brief,
      atlasOutput,
      hermesOutput,
    });
    const synthesisMs = Date.now() - tSynthStart;
    this.logger.log(`Phase 3 (synthesis) done in ${synthesisMs}ms`);

    const totalElapsedMs = Date.now() - t0;
    this.logger.log(`═══ Orchestration complete in ${totalElapsedMs}ms ═══`);

    return {
      brief,
      decomposition,
      atlasOutput,
      hermesOutput,
      synthesis,
      metrics: {
        totalElapsedMs,
        decompositionMs,
        parallelExecutionMs,
        synthesisMs,
      },
    };
  }
}
