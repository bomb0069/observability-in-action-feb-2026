// OpenTelemetry Auto-Instrumentation Setup
// This file must be loaded BEFORE any other application code
const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-grpc");
const {
  OTLPMetricExporter,
} = require("@opentelemetry/exporter-metrics-otlp-grpc");
const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-grpc");
const { Resource } = require("@opentelemetry/resources");
const {
  SemanticResourceAttributes,
} = require("@opentelemetry/semantic-conventions");
const {
  LoggerProvider,
  SimpleLogRecordProcessor,
} = require("@opentelemetry/sdk-logs");
const { logs } = require("@opentelemetry/api-logs");

// Configure OTLP Exporters
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4317";

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || otlpEndpoint,
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || otlpEndpoint,
});

const logExporter = new OTLPLogExporter({
  url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || otlpEndpoint,
});

// Create resource
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]:
    process.env.OTEL_SERVICE_NAME || "point-service",
  [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
});

// Configure Logger Provider
const loggerProvider = new LoggerProvider({
  resource: resource,
});
loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(logExporter));
logs.setGlobalLoggerProvider(loggerProvider);

// Patch console.log to send logs to OpenTelemetry
const logger = loggerProvider.getLogger("point-service");
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

console.log = function (...args) {
  originalConsoleLog.apply(console, args);
  logger.emit({
    severityText: "INFO",
    body: args.join(" "),
    timestamp: Date.now(),
  });
};

console.error = function (...args) {
  originalConsoleError.apply(console, args);
  logger.emit({
    severityText: "ERROR",
    body: args.join(" "),
    timestamp: Date.now(),
  });
};

console.warn = function (...args) {
  originalConsoleWarn.apply(console, args);
  logger.emit({
    severityText: "WARN",
    body: args.join(" "),
    timestamp: Date.now(),
  });
};

console.info = function (...args) {
  originalConsoleInfo.apply(console, args);
  logger.emit({
    severityText: "INFO",
    body: args.join(" "),
    timestamp: Date.now(),
  });
};

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: resource,
  traceExporter,
  metricReader:
    new (require("@opentelemetry/sdk-metrics").PeriodicExportingMetricReader)({
      exporter: metricExporter,
      exportIntervalMillis: 60000,
    }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Automatically instrument all supported libraries
      "@opentelemetry/instrumentation-http": {
        enabled: true,
      },
      "@opentelemetry/instrumentation-express": {
        enabled: true,
      },
      "@opentelemetry/instrumentation-mysql2": {
        enabled: true,
      },
    }),
  ],
});

// Start SDK
sdk.start();

console.log(
  "OpenTelemetry SDK initialized for point-service with Traces, Metrics, and Logs",
);

// Graceful shutdown
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("OpenTelemetry SDK terminated"))
    .catch((error) => console.log("Error terminating OpenTelemetry SDK", error))
    .finally(() => process.exit(0));
});

module.exports = sdk;
