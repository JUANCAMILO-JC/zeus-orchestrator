import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { AgenticOrchestratorService } from './agentic-orchestrator.service';
import { OrchestrationStoreService } from './orchestration-store.service';

@Module({
  imports: [AgentsModule, AnthropicModule],
  controllers: [OrchestratorController],
  providers: [OrchestratorService, AgenticOrchestratorService, OrchestrationStoreService],
})
export class OrchestratorModule {}
