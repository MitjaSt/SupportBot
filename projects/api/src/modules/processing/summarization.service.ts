import { ConfigService } from '@/config/config.service';
import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import OpenAI from 'openai';
import { join } from 'path';

const SUMMARIZATION_PROMPT = `You are building a knowledge base for the RAG Project.
Convert the following source text into a concise knowledge base entry.

Rules:
- Write in direct, declarative sentences as if stating facts ("Wet AMD is treated with..." not "The text discusses wet AMD treatment...")
- Never refer to the source material ("the text", "this article", "the page", "the document", "the following" etc.)
- Preserve all specific medical terms, drug names, statistics, and advice exactly as stated
- Use present tense
- Be comprehensive but concise — cover every distinct fact, condition, or piece of advice mentioned

Source text:
{text}

Knowledge base entry:`;

export interface SummarizeResult {
  summarized: number;
  skipped: number;
  errors: number;
}

@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);
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

    const response = await this.openaiClient.chat.completions.create({
      model: this.config.openai.chatModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0,
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
      this.logger.error(`Failed to summarize ${filename}:`, error);
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
