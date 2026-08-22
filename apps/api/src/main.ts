// reflect-metadata MUST be the very first import: it polyfills the global
// Reflect.getMetadata/defineMetadata that emitDecoratorMetadata relies on.
// Without it, every constructor-injected dependency that isn't explicitly
// @Inject()-annotated (Reflector, PrismaService, ...) silently resolves to
// undefined instead of throwing — which is a much nastier failure mode
// than a missing-import error, so don't be tempted to drop this because
// "nothing seems to use it directly".
import 'reflect-metadata';

// dotenv MUST load next — before OpenTelemetry reads OTEL_* env vars
// right below, and before anything else touches process.env. Silently
// does nothing if there's no .env file (e.g. real deployments, which get
// env vars injected by the platform instead), so this is always safe.
import 'dotenv/config';

// OpenTelemetry MUST start before anything else is imported so
// auto-instrumentation can patch http/express/@prisma/client. Do not move
// this below the other imports, and do not add imports above it (other
// than the dotenv import above, which must run first).
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
