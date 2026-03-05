import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';

type PromptGuardLabel = 'BENIGN' | 'INJECTION' | 'JAILBREAK';

interface ClassifyResponse {
  label: PromptGuardLabel;
  score: number;
}

@Injectable()
export class PromptGuardService {
  private readonly logger = new Logger(PromptGuardService.name);
  private readonly enabled: boolean;
  private readonly url: string;

  constructor(private readonly config: ConfigService) {
    this.enabled = config.promptGuard.enabled;
    this.url = config.promptGuard.url;
    if (this.enabled) {
      this.logger.log(`PromptGuard enabled — sidecar: ${this.url}`);
    }
  }

  /**
   * Scans text for prompt injection or jailbreak attempts.
   * Throws BadRequestException if a threat is detected.
   * Fails open (logs warning) if the sidecar is unreachable.
   */
  async scan(text: string): Promise<void> {
    if (!this.enabled) return;

    let result: ClassifyResponse;
    try {
      const response = await fetch(`${this.url}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        this.logger.warn(`PromptGuard returned ${response.status} — skipping scan`);
        return;
      }

      result = await response.json() as ClassifyResponse;
    } catch (error) {
      this.logger.warn(`PromptGuard unreachable — skipping scan: ${error}`);
      return;
    }

    if (result.label !== 'BENIGN') {
      this.logger.warn(`PromptGuard blocked input: label=${result.label} score=${result.score.toFixed(3)}`);
      throw new BadRequestException('Your message could not be processed. Please rephrase and try again.');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.url}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
