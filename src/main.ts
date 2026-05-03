import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🏛️  ZEUS Orchestrator running on http://localhost:${port}`);
  logger.log(`   POST /orchestrate   — envía un brief y recibe la síntesis`);
  logger.log(`   GET  /orchestrate/health — health check`);
}
bootstrap();
