import { Global, Module } from '@nestjs/common';
import { loadEnv } from '@pdlc/config';
import { apiEnvSchema, type ApiEnv } from './env.schema';

export const APP_ENV = Symbol('APP_ENV');

/**
 * Fails fast at boot with a readable error if any required env var is
 * missing or malformed — the non-negotiable rule "no undefined-config bugs
 * at request time." Every other module injects `APP_ENV`, never reads
 * `process.env` directly.
 */
@Global()
@Module({
  providers: [
    {
      provide: APP_ENV,
      useFactory: (): ApiEnv => loadEnv(apiEnvSchema),
    },
  ],
  exports: [APP_ENV],
})
export class ConfigModule {}
