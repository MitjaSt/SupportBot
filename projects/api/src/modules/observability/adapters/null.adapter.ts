import type { ObservabilityAdapter } from '../observability.interface';

/**
 * No-op adapter used when no observability providers are enabled.
 */
export class NullAdapter implements ObservabilityAdapter {
  readonly name = 'null';
  readonly enabled = false;

  async getPrompt(): Promise<null> {
    return null;
  }

  async createTrace(): Promise<null> {
    return null;
  }

  async logRetrieval(): Promise<void> {}
  async logGeneration(): Promise<void> {}
  async logEvent(): Promise<void> {}
  async updateTrace(): Promise<void> {}
  async flush(): Promise<void> {}
  async shutdown(): Promise<void> {}
}
