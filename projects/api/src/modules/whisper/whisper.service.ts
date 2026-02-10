import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import { MetricsService } from '../metrics/metrics.service';

export interface TranscriptionResult {
  text: string;
  language: string;
  languageProbability?: number;
}

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);
  private readonly whisperUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {
    this.whisperUrl = config.whisper.url;
    this.logger.log(`Whisper service URL: ${this.whisperUrl}`);
  }

  /**
   * Transcribe audio file to text using Whisper service
   * @param audioBuffer Audio file buffer
   * @param filename Original filename (for format detection)
   * @returns Transcription result
   */
  async transcribe(audioBuffer: Buffer, filename: string): Promise<TranscriptionResult> {
    const transcriptionTimer = this.metrics.whisperTranscriptionDuration.startTimer();

    // Create FormData with native Node.js 18+ API
    const formData = new FormData();
    // Create a new Uint8Array from the buffer
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: this.getContentType(filename) });
    formData.append('audio', blob, filename);

    try {
      const response = await fetch(`${this.whisperUrl}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.metrics.whisperTranscriptionErrors.inc({ error_type: 'http_error' });
        throw new Error(`Whisper transcription failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json() as TranscriptionResult;
      this.logger.log(`Transcribed audio (${result.language}): ${result.text.substring(0, 50)}...`);

      transcriptionTimer();
      this.metrics.whisperTranscriptionTotal.inc({ model: 'whisper-base', language: result.language });

      return result;
    } catch (error) {
      this.logger.error(`Transcription error: ${error}`);
      this.metrics.whisperTranscriptionErrors.inc({ error_type: 'exception' });
      transcriptionTimer();
      throw error;
    }
  }

  /**
   * Check if Whisper service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.whisperUrl}/health`);
      return response.ok;
    } catch (error) {
      this.logger.warn(`Whisper health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Get content type based on filename extension
   */
  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const contentTypes: Record<string, string> = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'ogg': 'audio/ogg',
      'webm': 'audio/webm',
      'm4a': 'audio/mp4',
      'flac': 'audio/flac',
    };
    return contentTypes[ext || ''] || 'audio/wav';
  }
}
