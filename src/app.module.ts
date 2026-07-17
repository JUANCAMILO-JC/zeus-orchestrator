import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './auth/api-key.guard';
import { OrchestratorModule } from './orchestrator/orchestrator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    OrchestratorModule,
  ],
  providers: [
    // Auth global: todos los endpoints exigen ZEUS_API_KEY (si está
    // configurada), salvo los marcados con @Public().
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
