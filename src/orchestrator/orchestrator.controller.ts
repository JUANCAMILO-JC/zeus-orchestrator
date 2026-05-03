import { Body, Controller, Post, Get } from '@nestjs/common';
import { OrchestratorService, OrchestrationResult } from './orchestrator.service';
import { BriefDto } from './brief.dto';

@Controller('orchestrate')
export class OrchestratorController {
  constructor(private readonly orchestrator: OrchestratorService) {}

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
   * GET /orchestrate/health
   * Verificación rápida de que el servicio está vivo.
   */
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
