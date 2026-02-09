import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import fetch from 'node-fetch';

@Injectable()
export class PiperService {
  private readonly logger = new Logger(PiperService.name);
  private readonly piperUrl: string;

  constructor(private readonly config: ConfigService) {
    this.piperUrl = config.piper.url;
    this.logger.log(`Piper TTS service URL: ${this.piperUrl}`);
  }

  /**
   * Synthesize text to speech using Piper TTS
   * @param text Text to synthesize
   * @returns Audio buffer (WAV format)
   */
  async synthesize(text: string): Promise<Buffer> {
    try {
      const response = await fetch(`${this.piperUrl}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Piper synthesis failed: ${response.statusText} - ${errorText}`);
      }

      const audioBuffer = await response.buffer();
      this.logger.log(`Synthesized ${text.substring(0, 50)}... (${audioBuffer.length} bytes)`);

      return audioBuffer;
    } catch (error) {
      this.logger.error(`Synthesis error: ${error}`);
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
