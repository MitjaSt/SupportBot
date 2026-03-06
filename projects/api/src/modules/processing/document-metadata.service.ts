import { ConfigService } from '@/config/config.service';
import { Injectable, Logger } from '@nestjs/common';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { ScrapedPage } from './processing.service';

export interface DocumentMetadata {
  title: string;
  url: string;
}

@Injectable()
export class DocumentMetadataService {
  private readonly logger = new Logger(DocumentMetadataService.name);

  constructor(private readonly config: ConfigService) {}

  async loadMetadata(): Promise<Map<string, DocumentMetadata>> {
    const jsonDir = this.config.filesystem.cacheJsonDir;
    const map = new Map<string, DocumentMetadata>();

    let files: string[];
    try {
      files = await readdir(jsonDir);
    } catch {
      this.logger.warn(`JSON cache dir not found: ${jsonDir}`);
      return map;
    }

    for (const filename of files.filter((f) => f.endsWith('.json'))) {
      try {
        const content = await readFile(join(jsonDir, filename), 'utf-8');
        const page: ScrapedPage = JSON.parse(content);
        const sourceName = filename.replace('.json', '');
        map.set(sourceName, { title: page.title ?? '', url: page.url ?? '' });
      } catch (err) {
        this.logger.warn(`Failed to read metadata from ${filename}: ${err}`);
      }
    }

    this.logger.log(`Loaded metadata for ${map.size} documents`);
    return map;
  }
}
