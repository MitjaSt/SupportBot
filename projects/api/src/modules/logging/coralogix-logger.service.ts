import { ConsoleLogger } from '@nestjs/common';

interface CoralogixEntry {
  timestamp: number;
  severity: number;
  applicationName: string;
  subsystemName: string;
  json: Record<string, unknown>;
}

// Coralogix severity levels
const SEV = { DEBUG: 1, VERBOSE: 2, INFO: 3, WARN: 4, ERROR: 5, CRITICAL: 6 } as const;

/**
 * Extends NestJS ConsoleLogger to ship log entries to Coralogix in the background.
 * Stdout output is unchanged — this is purely additive.
 *
 * Required env var (add to .env.secrets):
 *   CORALOGIX_API_KEY   — "Send Your Data" API key from the Coralogix console
 *
 * Optional env vars (add to .env.config):
 *   CORALOGIX_ENABLE             — set to "true" to activate shipping (default: false)
 *   CORALOGIX_ENDPOINT           — regional ingress base URL (default: https://ingress.coralogix.com)
 *   CORALOGIX_APPLICATION_NAME   — application label shown in Coralogix (default: rag-project)
 *   CORALOGIX_SUBSYSTEM_NAME     — subsystem label (default: api)
 */
export class CoralogixLoggerService extends ConsoleLogger {
  private readonly enabled: boolean;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly applicationName: string;
  private readonly subsystemName: string;
  private readonly buffer: CoralogixEntry[] = [];
  private readonly flushInterval: NodeJS.Timeout | undefined;

  constructor() {
    super();
    this.enabled = process.env.CORALOGIX_ENABLE?.toLowerCase() === 'true';
    this.apiKey = process.env.CORALOGIX_API_KEY ?? '';
    this.applicationName = process.env.CORALOGIX_APPLICATION_NAME ?? 'rag-project';
    this.subsystemName = process.env.CORALOGIX_SUBSYSTEM_NAME ?? 'api';
    const base = (process.env.CORALOGIX_ENDPOINT ?? 'https://ingress.coralogix.com').replace(/\/$/, '');
    this.endpoint = `${base}/logs/v1/singles`;

    if (this.enabled && this.apiKey) {
      // Flush every 2 seconds. unref() so the timer doesn't keep the process alive at shutdown.
      this.flushInterval = setInterval(() => this.flush(), 2000).unref();
      process.stderr.write(
        `[Coralogix] enabled — shipping to ${this.endpoint} (app=${this.applicationName}, subsystem=${this.subsystemName})\n`,
      );
    } else if (this.enabled && !this.apiKey) {
      process.stderr.write('[Coralogix] CORALOGIX_ENABLE=true but CORALOGIX_API_KEY is not set\n');
    }
  }

  override log(message: unknown, context?: string): void {
    super.log(message, context);
    this.ship(message, SEV.INFO, context);
  }

  override error(message: unknown, stackOrContext?: string, context?: string): void {
    super.error(message, stackOrContext, context);
    // When context is provided, stackOrContext is the stack trace; otherwise it is the context.
    const [stack, ctx] = context ? [stackOrContext, context] : [undefined, stackOrContext];
    this.ship(message, SEV.ERROR, ctx, stack);
  }

  override warn(message: unknown, context?: string): void {
    super.warn(message, context);
    this.ship(message, SEV.WARN, context);
  }

  override debug(message: unknown, context?: string): void {
    super.debug(message, context);
    this.ship(message, SEV.DEBUG, context);
  }

  override verbose(message: unknown, context?: string): void {
    super.verbose(message, context);
    this.ship(message, SEV.VERBOSE, context);
  }

  override fatal(message: unknown, context?: string): void {
    super.fatal(message, context);
    this.ship(message, SEV.CRITICAL, context);
  }

  /** Final flush — call this during graceful shutdown. */
  async shutdown(): Promise<void> {
    if (this.flushInterval) clearInterval(this.flushInterval);
    await this.flush();
  }

  // ---------------------------------------------------------------------------

  private ship(message: unknown, severity: number, context?: string, stack?: string): void {
    if (!this.enabled || !this.apiKey) return;

    const json: Record<string, unknown> = {
      message: typeof message === 'object' ? message : String(message),
    };
    if (context) json.context = context;
    if (stack) json.stack = stack;

    this.buffer.push({
      timestamp: Date.now(),
      severity,
      applicationName: this.applicationName,
      subsystemName: this.subsystemName,
      json,
    });

    if (this.buffer.length >= 100) {
      void this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (!this.enabled || this.buffer.length === 0) return;

    const entries = this.buffer.splice(0, this.buffer.length);

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        // Coralogix /singles accepts a JSON array of log entry objects directly.
        body: JSON.stringify(entries),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '(unreadable)');
        process.stderr.write(`[Coralogix] ${res.status} ${res.statusText} — ${body}\n`);
      }
    } catch (err) {
      process.stderr.write(`[Coralogix] fetch failed — ${String(err)}\n`);
    }
  }
}
