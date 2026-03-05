// This file MUST be the first import in main.ts.
// Sentry patches Node.js internals at startup — nothing else should load before it.
import * as Sentry from '@sentry/nestjs';
import { config } from 'dotenv';
import { resolve } from 'path';

// instrument.ts runs before ConfigModule, so dotenv hasn't loaded yet.
// Load .env explicitly — same file as config.service.ts, just one fewer level up.
config({ path: resolve(__dirname, '../../../.env') });

const dsn = process.env.SENTRY_DSN;
const enabled = process.env.SENTRY_ENABLE?.toLowerCase() === 'true';

if (enabled && dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Inject git SHA at build time via SENTRY_RELEASE env var for release tracking.
    release: process.env.SENTRY_RELEASE,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    // Performance tracing off by default — Prometheus already covers latency.
    // Set SENTRY_TRACES_SAMPLE_RATE=0.1 to opt in.
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'),
  });
}
