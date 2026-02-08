import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { get_encoding, type Tiktoken } from 'tiktoken';
import * as yaml from 'js-yaml';
import { ConfigService } from '@/config/config.service';

export interface PromptLogTokens {
  prompt_estimate: number;
  query_estimate: number;
  response_estimate: number;
  total_estimate: number;
}

export interface PromptLogEntry {
  start_time: string;
  end_time: string;
  model: string;
  prompt: string;
  chunks: string[];
  chunks_length: number;
  query: string;
  response: string;
  elapsed_seconds: number;
  tokens: PromptLogTokens;
}

@Injectable()
export class PromptLoggerService implements OnModuleInit {
  private readonly logger = new Logger(PromptLoggerService.name);
  private readonly promptsDir: string;
  private encoder!: Tiktoken;

  constructor(private readonly config: ConfigService) {
    this.promptsDir = config.filesystem.cachePromptsDir;
  }

  onModuleInit() {
    this.encoder = get_encoding('cl100k_base');
  }

  private countTokens(text: string): number {
    return this.encoder.encode(text).length;
  }

  private sanitizeFilename(text: string, maxLength = 50): string {
    let result = text.replace(/\s+/g, '_');
    result = result.replace(/[<>:"/\\|?*]/g, '');
    result = result.slice(0, maxLength);
    result = result.replace(/[_.]+$/, '');
    return result.toLowerCase();
  }

  private formatTimestamp(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
      `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
  }

  buildLogEntry(params: {
    startTime: Date;
    endTime: Date;
    model: string;
    prompt: string;
    chunks: string[];
    query: string;
    response: string;
  }): PromptLogEntry {
    const promptTokens = this.countTokens(params.prompt);
    const queryTokens = this.countTokens(params.query);
    const responseTokens = this.countTokens(params.response);

    return {
      start_time: params.startTime.toISOString(),
      end_time: params.endTime.toISOString(),
      model: params.model,
      prompt: params.prompt,
      chunks: params.chunks,
      chunks_length: params.chunks.length,
      query: params.query,
      response: params.response,
      elapsed_seconds:
        Math.round((params.endTime.getTime() - params.startTime.getTime()) / 10) / 100,
      tokens: {
        prompt_estimate: promptTokens,
        query_estimate: queryTokens,
        response_estimate: responseTokens,
        total_estimate: promptTokens + queryTokens + responseTokens,
      },
    };
  }

  async log(entry: PromptLogEntry): Promise<string> {
    await mkdir(this.promptsDir, { recursive: true });

    const timestamp = this.formatTimestamp(new Date(entry.start_time));
    const sanitized = this.sanitizeFilename(entry.query);
    const filename = `${timestamp}_${sanitized}.yaml`;
    const filepath = join(this.promptsDir, filename);

    const yamlStr = yaml.dump(entry, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      quotingType: "'",
    });

    await writeFile(filepath, yamlStr, 'utf-8');
    this.logger.log(`Prompt logged: ${filename}`);
    return filepath;
  }
}
