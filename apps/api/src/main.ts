// OpenTelemetry MUST start before anything else is imported so
// auto-instrumentation can patch http/express/@prisma/client. Do not move
// this below the other imports, and do not add imports above it.
import { startOtel } from './observability/otel';
startOtel();

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APP_ENV } from './config/config.module';
import type { ApiEnv } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.use(helmet());
  app.enableShutdownHooks();

  const env = app.get<ApiEnv>(APP_ENV);
  app.enableCors({ origin: env.CORS_ORIGIN, credentials: true });

  const openApiConfig = new DocumentBuilder()
    .setTitle('PDLC Platform API')
    .setDescription('OpenAPI 3.1 surface — every internal feature uses this same public API (A6).')
    .setVersion('0.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(env.PORT);
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during bootstrap', err);
  process.exit(1);
});
