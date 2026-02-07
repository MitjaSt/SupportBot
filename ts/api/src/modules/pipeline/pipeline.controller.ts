import { Controller, Get, Post } from '@nestjs/common';
import { ScrapingService } from '@/modules/scraping/scraping.service';
import { ProcessingService } from '@/modules/processing/processing.service';
import { EmbeddingsService } from '@/modules/embeddings/embeddings.service';
import { VectorDbService } from '@/modules/vector-db/vector-db.service';
import { ConfigService } from '@/config/config.service';
import type {
  ScrapeResult,
  ProcessResult,
  EmbedResult,
  CollectionInfo,
} from '@/dto/pipeline.dto';

@Controller('pipeline')
export class PipelineController {
  constructor(
    private readonly scraping: ScrapingService,
    private readonly processing: ProcessingService,
    private readonly embeddings: EmbeddingsService,
    private readonly vectorDb: VectorDbService,
    private readonly config: ConfigService,
  ) {}

  @Post('scrape')
  async scrape(): Promise<ScrapeResult> {
    const start = Date.now();
    const result = await this.scraping.scrapeAll((current, total) => {
      console.log(`Scraping progress: ${current}/${total}`);
    });
    return {
      ...result,
      duration: (Date.now() - start) / 1000,
    };
  }

  @Post('process')
  async process(): Promise<ProcessResult> {
    const start = Date.now();

    const flatResult = await this.processing.flattenAll();
    const chunks = await this.processing.processAndChunkAll();

    return {
      processed: flatResult.processed,
      skipped: flatResult.skipped,
      chunks: chunks.length,
      duration: (Date.now() - start) / 1000,
    };
  }

  @Post('embed')
  async embed(): Promise<EmbedResult> {
    const start = Date.now();

    const chunks = await this.processing.processAndChunkAll();

    await this.vectorDb.recreateCollection();

    const embeddedChunks = await this.embeddings.embedWithMetadata(chunks);

    const points = embeddedChunks.map((c) => ({
      vector: c.embedding,
      payload: {
        text: c.text,
        source: c.source,
        chunk_index: c.chunkIndex,
        chunk_length: c.text.length,
      },
    }));

    await this.vectorDb.upsertPoints(points);

    return {
      embedded: points.length,
      vectorSize: this.embeddings.getVectorSize(),
      model: this.embeddings.getModel(),
      duration: (Date.now() - start) / 1000,
    };
  }

  @Post('full')
  async fullPipeline(): Promise<{
    scrape: ScrapeResult;
    process: ProcessResult;
    embed: EmbedResult;
    totalDuration: number;
  }> {
    const start = Date.now();

    const scrape = await this.scrape();
    const process = await this.process();
    const embed = await this.embed();

    return {
      scrape,
      process,
      embed,
      totalDuration: (Date.now() - start) / 1000,
    };
  }

  @Get('collection')
  async getCollectionInfo(): Promise<CollectionInfo> {
    const info = await this.vectorDb.getCollectionInfo();
    return {
      collectionName: this.config.qdrant.collectionName,
      ...info,
    };
  }
}
