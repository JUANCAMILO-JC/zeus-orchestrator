import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { OrchestratorService, OrchestrationResult } from './orchestrator.service';
import {
  OrchestrationStoreService,
  OrchestrationSummary,
} from './orchestration-store.service';
import { BriefDto } from './brief.dto';

@Controller('orchestrate')
export class OrchestratorController {
  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly store: OrchestrationStoreService,
  ) {}

  /**
   * POST /orchestrate
   * Body: { "brief": "..." }
   *
   * Devuelve el resultado completo del flujo: decomposición, outputs de
   * cada arquitecto, síntesis final y métricas de tiempo.
   */
  @Post()
  async orchestrate(@Body() dto: BriefDto): Promise<OrchestrationResult> {
    return this.orchestrator.orchestrate(dto.brief);
  }

  /**
   * POST /orchestrate/stream
   * Body: { "brief": "..." }
   *
   * Igual que POST /orchestrate, pero responde con Server-Sent Events:
   * emite un evento `phase` por cada fase (start/complete/error) y un
   * evento `result` final con el resultado completo.
   */
  @Post('stream')
  async orchestrateStream(@Body() dto: BriefDto, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await this.orchestrator.orchestrate(dto.brief, (phaseEvent) =>
        send('phase', phaseEvent),
      );
      send('result', result);
    } catch (err) {
      send('error', { message: err instanceof Error ? err.message : String(err) });
    } finally {
      res.end();
    }
  }

  /**
   * GET /orchestrate/runs
   * Lista las orquestaciones persistidas (id, fecha y brief truncado).
   */
  @Get('runs')
  async listRuns(): Promise<OrchestrationSummary[]> {
    return this.store.list();
  }

  /**
   * GET /orchestrate/runs/:id
   * Devuelve una orquestación persistida completa.
   */
  @Get('runs/:id')
  async getRun(@Param('id') id: string): Promise<OrchestrationResult> {
    const result = await this.store.get(id);
    if (!result) {
      throw new NotFoundException(`Orchestration ${id} not found`);
    }
    return result;
  }

  /**
   * GET /orchestrate/health
   * Verificación rápida de que el servicio está vivo.
   */
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
