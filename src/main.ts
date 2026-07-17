import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Web UI: archivos estáticos de public/ servidos en la raíz. Se sirve
  // desde el cwd para que funcione igual en dev (nest start) y en prod
  // (node dist/main) sin pasos de copia.
  app.useStaticAssets(join(process.cwd(), 'public'));

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🏛️  ZEUS Orchestrator running on http://localhost:${port}`);
  logger.log(`   GET  /                — Web UI de chat`);
  logger.log(`   POST /orchestrate     — envía un brief y recibe la síntesis`);
  logger.log(`   GET  /orchestrate/health — health check`);
}
bootstrap();
