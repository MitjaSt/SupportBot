import { ConfigService } from '@/config/config.service';
import type {
  CollectionInfo,
  EmbedResult,
  ProcessResult,
  SummarizeResult,
} from '@/dto/pipeline.dto';
import { EmbeddingsService } from '@/modules/embeddings/embeddings.service';
import { DocumentMetadataService } from '@/modules/processing/document-metadata.service';
import { ProcessingService } from '@/modules/processing/processing.service';
import { SummarizationService } from '@/modules/processing/summarization.service';
import { VectorDbService } from '@/modules/vector-db/vector-db.service';
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { Permissions } from '@/modules/auth/decorators/permissions.decorator';
import { CriteriaGenerationService } from '../processing/criteria-generation.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('pipeline:write')
@Controller('pipeline')
export class PipelineController {
  constructor(
    private readonly processing: ProcessingService,
    private readonly summarization: SummarizationService,
    private readonly criteriaGeneration: CriteriaGenerationService,
    private readonly embeddings: EmbeddingsService,
    private readonly vectorDb: VectorDbService,
    private readonly config: ConfigService,
    private readonly documentMetadata: DocumentMetadataService,
  ) {}

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

  @Post('summarize')
  async summarize(): Promise<SummarizeResult> {
    const start = Date.now();

    const result = await this.summarization.summarizeAll((current, total) => {
      console.log(`Summarization progress: ${current}/${total}`);
    });

    return {
      ...result,
      duration: (Date.now() - start) / 1000,
    };
  }

  @Post('embed')
  async embed(): Promise<EmbedResult> {
    const start = Date.now();

    const chunks = await this.processing.processAndChunkAll();

    await this.vectorDb.recreateCollection();

    const embeddedChunks = await this.embeddings.embedWithMetadata(chunks);
    const metadataMap = await this.documentMetadata.loadMetadata();

    const points = embeddedChunks.map((c) => {
      const meta = metadataMap.get(c.source);
      return {
        vector: c.embedding,
        payload: {
          text: c.text,
          source: c.source,
          chunk_index: c.chunkIndex,
          chunk_length: c.text.length,
          title: meta?.title,
          url: meta?.url,
        },
      };
    });

    await this.vectorDb.upsertPoints(points);

    return {
      embedded: points.length,
      vectorSize: this.embeddings.getVectorSize(),
      model: this.embeddings.getModel(),
      duration: (Date.now() - start) / 1000,
    };
  }

  @Post('criteria-generation')
  async criteria(): Promise<SummarizeResult> {
    const start = Date.now();

    const result = await this.criteriaGeneration.criteriaGeneration((current, total) => {
      console.log(`Criteria generation progress: ${current}/${total}`);
    });

    return {
      ...result,
      duration: (Date.now() - start) / 1000,
    };
  }

  @Post('full')
  async fullPipeline(): Promise<{
    process: ProcessResult;
    summarize: SummarizeResult;
    embed: EmbedResult;
    totalDuration: number;
  }> {
    const start = Date.now();

    const process = await this.process();
    const summarize = await this.summarize();
    const embed = await this.embed();

    return {
      process,
      summarize,
      embed,
      totalDuration: (Date.now() - start) / 1000,
    };
  }

  @Get('collection')
  async getCollectionInfo(): Promise<CollectionInfo> {
    const info = await this.vectorDb.getCollectionInfo();
    return {
      collectionName: 'vectors',
      ...info,
    };
  }
}
