import { ConfigService } from '@/config/config.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync } from 'fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { get_encoding, type Tiktoken } from 'tiktoken';

export interface ScrapedPage {
  url: string;
  title: string;
  content: Array<{
    type: 'heading' | 'paragraph';
    level?: number;
    text: string;
  }>;
  scrapedAt: string;
}

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
export class ProcessingService implements OnModuleInit {
  private readonly logger = new Logger(ProcessingService.name);
  private readonly jsonDir: string;
  private readonly flatDir: string;
  private readonly summariesDir: string;
  private readonly chunkSize: number;
  private readonly overlapSize: number;
  private encoder!: Tiktoken;

  constructor(private readonly config: ConfigService) {
    this.jsonDir = config.filesystem.cacheJsonDir;
    this.flatDir = config.filesystem.cacheFlatDir;
    this.summariesDir = config.filesystem.cacheSummariesDir;
    this.chunkSize = config.chunking.chunkSizeTokens;
    this.overlapSize = config.chunking.overlapTokens;
  }

  onModuleInit() {
    // Use cl100k_base encoding (used by text-embedding-3-small/large)
    this.encoder = get_encoding('cl100k_base');
  }

  private countTokens(text: string): number {
    return this.encoder.encode(text).length;
  }

  /**
   * Split text into sentences using regex patterns.
   *
   * The core challenge: the period character (.) appears in multiple contexts —
   * sentence endings, decimal numbers (1.5m), and abbreviations (Dr., e.g.).
   * We must protect non-boundary periods before splitting, then restore them.
   *
   * Strategy:
   * 1. Replace non-boundary periods with a private-use placeholder character.
   * 2. Run the split regex (which now only sees true sentence-ending periods).
   * 3. Restore the placeholder back to "." in the output.
   */
  private splitIntoSentences(text: string): string[] {
    // Private-use Unicode characters as placeholders — safe because they
    // won't appear in any real medical document text.
    const DECIMAL_DOT = '\uE000'; // protects: 1.5, 2.3, 0.7
    const ABBREV_DOT  = '\uE001'; // protects: Dr., Mr., e.g., etc.

    let working = text;

    // Protect decimal numbers: digit . digit  →  digit \uE000 digit
    // Covers: 1.5m, 0.7, 2.3 million, etc.
    working = working.replace(/(\d)\.(\d)/g, `$1${DECIMAL_DOT}$2`);

    // Protect ordinal / list-item numbers: "1. Early signs" — the period
    // after a standalone number at the start of a word boundary is often a
    // list marker, not a sentence end.  We identify these by requiring that
    // the digit is preceded by whitespace or start-of-string AND the period
    // is followed by whitespace + lowercase letter.
    working = working.replace(/((?:^|\s)\d+)\.(\s+[a-z])/g, `$1${DECIMAL_DOT}$2`);

    // Protect common abbreviations.  The list covers the most frequent ones
    // in medical/charity documents; extend it if new false splits appear.
    working = working.replace(
      /\b(Dr|Mr|Mrs|Ms|Prof|St|vs|etc|approx|no|fig|ref|vol|ed|pp|e\.g|i\.e)\.(?=\s)/gi,
      `$1${ABBREV_DOT}`,
    );

    // Now split on genuine sentence boundaries:
    // [^.!?]* — any non-terminal content
    // [.!?]+  — one or more terminal punctuation marks
    // (?:\s+|$) — followed by whitespace or end of string
    const pattern = /[^.!?]*[.!?]+(?:\s+|$)|[^.!?]+$/g;
    const matches = working.match(pattern);

    if (!matches) {
      return text.trim() ? [text.trim()] : [];
    }

    return matches
      .map((m) =>
        m
          .replace(new RegExp(DECIMAL_DOT, 'g'), '.')
          .replace(new RegExp(ABBREV_DOT,  'g'), '.')
          .trim(),
      )
      .filter(Boolean);
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

  /**
   * Load documents for chunking.
   * Prefers summaries folder if it exists and has files, otherwise falls back to flat folder.
   */
  async loadFlattenedDocuments(): Promise<FlattenedDocument[]> {
    // Prefer summaries if available (post-LLM summarization)
    const sourceDir = existsSync(this.summariesDir)
      ? this.summariesDir
      : this.flatDir;

    if (!existsSync(sourceDir)) {
      return [];
    }

    const files = await readdir(sourceDir);
    const txtFiles = files.filter((f) => f.endsWith('.txt'));

    // If summaries dir exists but is empty, fall back to flat
    if (txtFiles.length === 0 && sourceDir === this.summariesDir) {
      if (!existsSync(this.flatDir)) {
        return [];
      }
      const flatFiles = await readdir(this.flatDir);
      const flatTxtFiles = flatFiles.filter((f) => f.endsWith('.txt'));

      const docs: FlattenedDocument[] = [];
      for (const filename of flatTxtFiles) {
        const text = await readFile(join(this.flatDir, filename), 'utf-8');
        docs.push({
          source: filename.replace('.txt', ''),
          text,
        });
      }
      return docs;
    }

    const docs: FlattenedDocument[] = [];
    for (const filename of txtFiles) {
      const text = await readFile(join(sourceDir, filename), 'utf-8');
      docs.push({
        source: filename.replace('.txt', ''),
        text,
      });
    }

    this.logger.log(`Loaded ${docs.length} documents from ${sourceDir}`);
    return docs;
  }

  /**
   * Semantic chunking: respects sentence boundaries and uses accurate token counting.
   */
  chunkDocument(doc: FlattenedDocument): TextChunk[] {
    const chunks: TextChunk[] = [];
    const sentences = this.splitIntoSentences(doc.text);

    if (sentences.length === 0) {
      return [];
    }

    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;

    // Track sentences for overlap
    const sentenceTokenCounts = sentences.map((s) => this.countTokens(s));

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = sentenceTokenCounts[i];

      // If single sentence exceeds chunk size, split it by words
      if (sentenceTokens > this.chunkSize) {
        // Flush current chunk first
        if (currentChunk.length > 0) {
          const text = currentChunk.join(' ');
          chunks.push({
            text,
            source: doc.source,
            chunkIndex: chunkIndex++,
            chunkLength: text.length,
          });
          currentChunk = [];
          currentTokens = 0;
        }

        // Split long sentence into smaller pieces
        const words = sentence.split(/\s+/);
        let wordChunk: string[] = [];
        let wordTokens = 0;

        for (const word of words) {
          const wordTokenCount = this.countTokens(word + ' ');
          if (wordTokens + wordTokenCount > this.chunkSize && wordChunk.length > 0) {
            const text = wordChunk.join(' ');
            chunks.push({
              text,
              source: doc.source,
              chunkIndex: chunkIndex++,
              chunkLength: text.length,
            });
            wordChunk = [];
            wordTokens = 0;
          }
          wordChunk.push(word);
          wordTokens += wordTokenCount;
        }

        if (wordChunk.length > 0) {
          currentChunk = wordChunk;
          currentTokens = wordTokens;
        }
        continue;
      }

      // Check if adding this sentence would exceed the limit
      if (currentTokens + sentenceTokens > this.chunkSize && currentChunk.length > 0) {
        // Create chunk from current sentences
        const text = currentChunk.join(' ');
        chunks.push({
          text,
          source: doc.source,
          chunkIndex: chunkIndex++,
          chunkLength: text.length,
        });

        // Calculate overlap: include sentences from end of previous chunk
        // that fit within overlap token budget
        const overlapSentences: string[] = [];
        let overlapTokens = 0;

        for (let j = currentChunk.length - 1; j >= 0; j--) {
          const sentenceText = currentChunk[j];
          const tokens = this.countTokens(sentenceText);
          if (overlapTokens + tokens <= this.overlapSize) {
            overlapSentences.unshift(sentenceText);
            overlapTokens += tokens;
          } else {
            break;
          }
        }

        currentChunk = overlapSentences;
        currentTokens = overlapTokens;
      }

      // Add sentence to current chunk
      currentChunk.push(sentence);
      currentTokens += sentenceTokens;
    }

    // Don't forget the last chunk
    if (currentChunk.length > 0) {
      const text = currentChunk.join(' ');
      chunks.push({
        text,
        source: doc.source,
        chunkIndex: chunkIndex++,
        chunkLength: text.length,
      });
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
