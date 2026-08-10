/**
 * OpenTelemetry bootstrap. Imported as the very first line of main.ts (see
 * comment there) so auto-instrumentation patches HTTP/Express/Prisma
 * before those modules are required elsewhere in the app.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | undefined;

export function startOtel(): void {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const serviceName = process.env.OTEL_SERVICE_NAME ?? 'pdlc-api';

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '0.0.0',
    }),
    // No endpoint configured (e.g. local dev without a collector) => traces
    // are generated but exported nowhere. That's an intentional soft-fail:
    // observability must never block app boot.
    traceExporter: endpoint ? new OTLPTraceExporter({ url: endpoint }) : undefined,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Reduce noise from framework internals; keep HTTP + Prisma spans.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  try {
    sdk.start();
  } catch (err) {
    console.error('OpenTelemetry failed to start; continuing without tracing.', err);
  }
}

export async function shutdownOtel(): Promise<void> {
  await sdk?.shutdown();
}
