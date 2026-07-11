import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { OrchestrationStoreService } from './orchestration-store.service';

@Module({
  imports: [AgentsModule],
  controllers: [OrchestratorController],
  providers: [OrchestratorService, OrchestrationStoreService],
})
export class OrchestratorModule {}
