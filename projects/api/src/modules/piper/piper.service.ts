import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import fetch from 'node-fetch';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class PiperService {
  private readonly logger = new Logger(PiperService.name);
  private readonly piperUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {
    this.piperUrl = config.piper.url;
    this.logger.log(`Piper TTS service URL: ${this.piperUrl}`);
  }

  /**
   * Synthesize text to speech using Piper TTS
   * @param text Text to synthesize
   * @returns Audio buffer (WAV format)
   */
  async synthesize(text: string): Promise<Buffer> {
    const synthesisTimer = this.metrics.piperSynthesisDuration.startTimer();

    try {
      const response = await fetch(`${this.piperUrl}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.metrics.piperSynthesisErrors.inc({ error_type: 'http_error' });
        throw new Error(`Piper synthesis failed: ${response.statusText} - ${errorText}`);
      }

      const audioBuffer = await response.buffer();
      this.logger.log(`Synthesized ${text.substring(0, 50)}... (${audioBuffer.length} bytes)`);

      synthesisTimer();
      this.metrics.piperSynthesisTotal.inc({ voice: 'default', language: 'en' });
      this.metrics.piperAudioGenerated.inc(audioBuffer.length);

      return audioBuffer;
    } catch (error) {
      this.logger.error(`Synthesis error: ${error}`);
      this.metrics.piperSynthesisErrors.inc({ error_type: 'exception' });
      synthesisTimer();
      throw error;
    }
  }

  /**
   * Check if Piper service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.piperUrl}/health`);
      return response.ok;
    } catch (error) {
      this.logger.warn(`Piper health check failed: ${error}`);
      return false;
    }
  }
}
