import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { AgenticOrchestratorService } from './agentic-orchestrator.service';
import { OrchestrationStoreService } from './orchestration-store.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionStoreService } from './session-store.service';

@Module({
  imports: [AgentsModule, AnthropicModule],
  controllers: [OrchestratorController, SessionsController],
  providers: [
    OrchestratorService,
    AgenticOrchestratorService,
    OrchestrationStoreService,
    SessionsService,
    SessionStoreService,
  ],
})
export class OrchestratorModule {}
