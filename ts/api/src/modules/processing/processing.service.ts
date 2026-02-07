import { Injectable } from '@nestjs/common';
import { writeFile, mkdir, readdir, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@/config/config.service';
import type { ScrapedPage } from '../scraping/scraping.service';

// File prefixes to exclude (matching Python implementation)
const EXCLUDED_FILE_PREFIXES = [
  'about-',
  'accessibility',
  'careers',
  'contact',
  'cookie',
  'donate',
  'membership',
  'news-',
  'privacy',
  'shop',
  'terms',
  'volunteer',
];

export interface TextChunk {
  text: string;
  source: string;
  chunkIndex: number;
  chunkLength: number;
}

export interface FlattenedDocument {
  source: string;
  text: string;
}

@Injectable()
export class ProcessingService {
  private readonly jsonDir: string;
  private readonly flatDir: string;
  private readonly chunkSize: number;
  private readonly overlapSize: number;

  constructor(private readonly config: ConfigService) {
    this.jsonDir = config.filesystem.cacheJsonDir;
    this.flatDir = config.filesystem.cacheFlatDir;
    this.chunkSize = config.chunking.chunkSizeTokens;
    this.overlapSize = config.chunking.overlapTokens;
  }

  async flattenAll(): Promise<{ processed: number; skipped: number }> {
    // Clear and recreate flat directory
    if (existsSync(this.flatDir)) {
      await rm(this.flatDir, { recursive: true });
    }
    await mkdir(this.flatDir, { recursive: true });

    const files = await readdir(this.jsonDir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    let processed = 0;
    let skipped = 0;

    for (const filename of jsonFiles) {
      // Check exclusion prefixes
      const baseName = filename.replace('.json', '');
      const isExcluded = EXCLUDED_FILE_PREFIXES.some((prefix) =>
        baseName.startsWith(prefix),
      );

      if (isExcluded) {
        skipped++;
        continue;
      }

      const content = await readFile(join(this.jsonDir, filename), 'utf-8');
      const page: ScrapedPage = JSON.parse(content);

      const flatText = this.flattenPage(page);
      if (flatText.trim()) {
        const outFilename = filename.replace('.json', '.txt');
        await writeFile(join(this.flatDir, outFilename), flatText);
        processed++;
      } else {
        skipped++;
      }
    }

    return { processed, skipped };
  }

  private flattenPage(page: ScrapedPage): string {
    const parts: string[] = [];

    if (page.title) {
      parts.push(page.title);
      parts.push('');
    }

    for (const item of page.content) {
      if (item.type === 'heading') {
        parts.push('');
        parts.push(item.text);
      } else {
        parts.push(item.text);
      }
    }

    return parts.join('\n').trim();
  }

  async loadFlattenedDocuments(): Promise<FlattenedDocument[]> {
    if (!existsSync(this.flatDir)) {
      return [];
    }

    const files = await readdir(this.flatDir);
    const txtFiles = files.filter((f) => f.endsWith('.txt'));
    const docs: FlattenedDocument[] = [];

    for (const filename of txtFiles) {
      const text = await readFile(join(this.flatDir, filename), 'utf-8');
      docs.push({
        source: filename.replace('.txt', ''),
        text,
      });
    }

    return docs;
  }

  chunkDocument(doc: FlattenedDocument): TextChunk[] {
    const chunks: TextChunk[] = [];
    const words = doc.text.split(/\s+/);

    // Approximate: 1 token ≈ 0.75 words (rough estimate)
    const wordsPerChunk = Math.floor(this.chunkSize * 0.75);
    const overlapWords = Math.floor(this.overlapSize * 0.75);

    let start = 0;
    let chunkIndex = 0;

    while (start < words.length) {
      const end = Math.min(start + wordsPerChunk, words.length);
      const chunkWords = words.slice(start, end);
      const text = chunkWords.join(' ');

      chunks.push({
        text,
        source: doc.source,
        chunkIndex,
        chunkLength: text.length,
      });

      // Move start with overlap
      start = end - overlapWords;
      if (start >= words.length - overlapWords) {
        break;
      }
      chunkIndex++;
    }

    return chunks;
  }

  chunkAllDocuments(docs: FlattenedDocument[]): TextChunk[] {
    const allChunks: TextChunk[] = [];

    for (const doc of docs) {
      const chunks = this.chunkDocument(doc);
      allChunks.push(...chunks);
    }

    return allChunks;
  }

  async processAndChunkAll(): Promise<TextChunk[]> {
    const docs = await this.loadFlattenedDocuments();
    return this.chunkAllDocuments(docs);
  }
}
