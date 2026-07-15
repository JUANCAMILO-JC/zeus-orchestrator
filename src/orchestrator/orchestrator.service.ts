import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { ApoloService } from '../agents/apolo.service';
import { AtlasService } from '../agents/atlas.service';
import { HermesService } from '../agents/hermes.service';
import { ZeusService, DecompositionResult } from '../agents/zeus.service';
import { OrchestrationStoreService } from './orchestration-store.service';

export interface OrchestrationResult {
  id: string;
  createdAt: string;
  brief: string;
  decomposition: DecompositionResult;
  atlasOutput: string | null;
  hermesOutput: string | null;
  apoloOutput: string | null;
  /** Errores no fatales: un arquitecto falló pero la síntesis continuó sin él. */
  errors: { atlas?: string; hermes?: string; apolo?: string } | null;
  synthesis: string;
  fromCache: boolean;
  metrics: {
    totalElapsedMs: number;
    decompositionMs: number;
    parallelExecutionMs: number;
    synthesisMs: number;
  };
}

export interface PhaseEvent {
  phase: 'decomposition' | 'atlas' | 'hermes' | 'apolo' | 'synthesis';
  status: 'start' | 'complete' | 'skipped' | 'error';
  elapsedMs?: number;
  error?: string;
}

type PhaseListener = (event: PhaseEvent) => void;

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  /** Caché en memoria: mismo brief (normalizado) → mismo resultado, sin re-ejecutar. */
  private readonly cache = new Map<string, OrchestrationResult>();

  constructor(
    private readonly zeus: ZeusService,
    private readonly atlas: AtlasService,
    private readonly hermes: HermesService,
    private readonly apolo: ApoloService,
    private readonly store: OrchestrationStoreService,
  ) {}

  /**
   * Flujo: Decomposición → Arquitectos en paralelo → Síntesis
   *
   * Si un arquitecto falla, el flujo continúa: la síntesis sabe manejar
   * outputs faltantes y el error queda registrado en `errors`.
   */
  async orchestrate(brief: string, onPhase?: PhaseListener): Promise<OrchestrationResult> {
    const cacheKey = this.cacheKey(brief);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for brief (${cached.id}) — skipping execution`);
      return { ...cached, fromCache: true };
    }

    const emit = (event: PhaseEvent) => {
      try {
        onPhase?.(event);
      } catch {
        // Un listener roto no debe tumbar la orquestación.
      }
    };

    const t0 = Date.now();
    this.logger.log('═══ Starting orchestration ═══');

    // FASE 1 — Decomposición (fatal si falla: sin queries no hay flujo)
    emit({ phase: 'decomposition', status: 'start' });
    const tDecompStart = Date.now();
    const decomposition = await this.zeus.decompose(brief);
    const decompositionMs = Date.now() - tDecompStart;
    emit({ phase: 'decomposition', status: 'complete', elapsedMs: decompositionMs });
    this.logger.log(
      `Phase 1 (decomposition) done in ${decompositionMs}ms · ` +
      `Atlas needed: ${!!decomposition.queries.atlas} · ` +
      `Hermes needed: ${!!decomposition.queries.hermes} · ` +
      `Apolo needed: ${!!decomposition.queries.apolo}`,
    );

    // FASE 2 — Arquitectos en paralelo, con degradación si alguno falla.
    const tParallelStart = Date.now();
    const errors: { atlas?: string; hermes?: string; apolo?: string } = {};

    const consult = async (
      name: 'atlas' | 'hermes' | 'apolo',
      query: string | null,
      agent: { consult(q: string): Promise<string> },
    ): Promise<string | null> => {
      if (!query) {
        emit({ phase: name, status: 'skipped' });
        return null;
      }
      emit({ phase: name, status: 'start' });
      const start = Date.now();
      try {
        const output = await agent.consult(query);
        emit({ phase: name, status: 'complete', elapsedMs: Date.now() - start });
        return output;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors[name] = message;
        this.logger.error(`${name.toUpperCase()} failed — continuing without it: ${message}`);
        emit({ phase: name, status: 'error', elapsedMs: Date.now() - start, error: message });
        return null;
      }
    };

    const [atlasOutput, hermesOutput, apoloOutput] = await Promise.all([
      consult('atlas', decomposition.queries.atlas, this.atlas),
      consult('hermes', decomposition.queries.hermes, this.hermes),
      consult('apolo', decomposition.queries.apolo, this.apolo),
    ]);
    const parallelExecutionMs = Date.now() - tParallelStart;
    this.logger.log(`Phase 2 (parallel architects) done in ${parallelExecutionMs}ms`);

    if (
      atlasOutput === null &&
      hermesOutput === null &&
      apoloOutput === null &&
      (errors.atlas || errors.hermes || errors.apolo)
    ) {
      // Todos los arquitectos requeridos fallaron: no hay nada que sintetizar.
      throw new Error(
        `All consulted architects failed (atlas: ${errors.atlas ?? 'n/a'}, ` +
        `hermes: ${errors.hermes ?? 'n/a'}, apolo: ${errors.apolo ?? 'n/a'})`,
      );
    }

    // FASE 3 — Síntesis
    emit({ phase: 'synthesis', status: 'start' });
    const tSynthStart = Date.now();
    const synthesis = await this.zeus.synthesize({ brief, atlasOutput, hermesOutput, apoloOutput });
    const synthesisMs = Date.now() - tSynthStart;
    emit({ phase: 'synthesis', status: 'complete', elapsedMs: synthesisMs });
    this.logger.log(`Phase 3 (synthesis) done in ${synthesisMs}ms`);

    const totalElapsedMs = Date.now() - t0;
    this.logger.log(`═══ Orchestration complete in ${totalElapsedMs}ms ═══`);

    const result: OrchestrationResult = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      brief,
      decomposition,
      atlasOutput,
      hermesOutput,
      apoloOutput,
      errors: Object.keys(errors).length > 0 ? errors : null,
      synthesis,
      fromCache: false,
      metrics: {
        totalElapsedMs,
        decompositionMs,
        parallelExecutionMs,
        synthesisMs,
      },
    };

    // Solo cachear resultados completos: un resultado degradado no debe
    // quedar congelado para futuros requests idénticos.
    if (!result.errors) {
      this.cache.set(cacheKey, result);
    }

    try {
      await this.store.save(result);
    } catch (err) {
      this.logger.warn(`Failed to persist orchestration ${result.id}: ${err}`);
    }

    return result;
  }

  private cacheKey(brief: string): string {
    return createHash('sha256').update(brief.trim().toLowerCase()).digest('hex');
  }
}
