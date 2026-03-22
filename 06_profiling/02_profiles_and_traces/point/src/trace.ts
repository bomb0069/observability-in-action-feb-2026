import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeSDK } from '@opentelemetry/sdk-node';
import * as process from 'process';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { TypeormInstrumentation } from 'opentelemetry-instrumentation-typeorm';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

const collectorOptions = {
  url: 'http://lgtm:4317',
  headers: {},
  concurrencyLimit: 10,
};

const exporter = new OTLPTraceExporter(collectorOptions);

export const otelSDK = new NodeSDK({
  spanProcessor: new BatchSpanProcessor(exporter) as any,

  instrumentations: [
    new HttpInstrumentation(),
    new NestInstrumentation(),
    new TypeormInstrumentation(),
  ],
  serviceName: 'point-service',
});

// Start SDK immediately at import time so instrumentations register
// BEFORE NestJS modules are imported in main.ts
otelSDK.start();
console.log('OpenTelemetry SDK started for point-service');

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(
      () => console.log('SDK shut down successfully'),
      (err) => console.log('Error shutting down SDK', err),
    )
    .finally(() => process.exit(0));
});
