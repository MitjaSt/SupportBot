import { Injectable } from '@nestjs/common';
import { writeFile, mkdir, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';
import { ConfigService } from '@/config/config.service';

const SUMMARIZATION_PROMPT = `You are a medical content summarizer for the Macular Society.
Summarize the following text about macular disease, keeping the key medical information,
symptoms, treatments, and advice. Keep the summary concise but comprehensive.
Preserve important medical terms and specific advice.

Text to summarize:
{text}

Summary:`;

export interface SummarizeResult {
  summarized: number;
  skipped: number;
  errors: number;
}

@Injectable()
export class SummarizationService {
  private readonly flatDir: string;
  private readonly summariesDir: string;
  private readonly openaiClient: OpenAI;
  private readonly maxConcurrent = 3;

  constructor(private readonly config: ConfigService) {
    this.flatDir = config.filesystem.cacheFlatDir;
    this.summariesDir = config.filesystem.cacheSummariesDir;
    this.openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
      timeout: config.openai.timeout * 1000,
    });
  }

  async summarizeText(text: string): Promise<string> {
    const prompt = SUMMARIZATION_PROMPT.replace('{text}', text);

    if (this.config.openai.enabled) {
      return this.summarizeWithOpenAI(prompt);
    } else {
      return this.summarizeWithOllama(prompt);
    }
  }

  private async summarizeWithOpenAI(prompt: string): Promise<string> {
    const response = await this.openaiClient.chat.completions.create({
      model: this.config.openai.chatModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() ?? '';
  }

  private async summarizeWithOllama(prompt: string): Promise<string> {
    const ollamaClient = new OpenAI({
      baseURL: `${this.config.ollama.url}/v1`,
      apiKey: 'ollama',
      timeout: this.config.ollama.timeout * 1000,
    });

    const response = await ollamaClient.chat.completions.create({
      model: this.config.ollama.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() ?? '';
  }

  async summarizeFile(filename: string): Promise<{
    status: 'success' | 'skipped' | 'error';
    reason?: string;
  }> {
    const inputPath = join(this.flatDir, filename);
    const outputPath = join(this.summariesDir, filename);

    // Skip if already summarized
    if (existsSync(outputPath)) {
      return { status: 'skipped', reason: 'already summarized' };
    }

    try {
      const text = await readFile(inputPath, 'utf-8');

      if (!text.trim()) {
        return { status: 'skipped', reason: 'empty file' };
      }

      const summary = await this.summarizeText(text);
      await writeFile(outputPath, summary);

      return { status: 'success' };
    } catch (error) {
      console.error(`Failed to summarize ${filename}:`, error);
      return { status: 'error', reason: String(error) };
    }
  }

  async summarizeAll(
    onProgress?: (current: number, total: number) => void,
  ): Promise<SummarizeResult> {
    // Ensure summaries directory exists
    if (!existsSync(this.summariesDir)) {
      await mkdir(this.summariesDir, { recursive: true });
    }

    // Get all flat files
    if (!existsSync(this.flatDir)) {
      return { summarized: 0, skipped: 0, errors: 0 };
    }

    const files = await readdir(this.flatDir);
    const txtFiles = files.filter((f) => f.endsWith('.txt'));

    let summarized = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches to avoid rate limits
    for (let i = 0; i < txtFiles.length; i += this.maxConcurrent) {
      const batch = txtFiles.slice(i, i + this.maxConcurrent);

      const results = await Promise.all(
        batch.map((file) => this.summarizeFile(file)),
      );

      for (const result of results) {
        if (result.status === 'success') {
          summarized++;
        } else if (result.status === 'skipped') {
          skipped++;
        } else {
          errors++;
        }
      }

      onProgress?.(Math.min(i + batch.length, txtFiles.length), txtFiles.length);
    }

    return { summarized, skipped, errors };
  }

  async getSummarizedFiles(): Promise<string[]> {
    if (!existsSync(this.summariesDir)) {
      return [];
    }
    const files = await readdir(this.summariesDir);
    return files.filter((f) => f.endsWith('.txt'));
  }
}
