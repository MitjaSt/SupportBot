import { Module } from '@nestjs/common';
import { WhisperService } from './whisper.service';
import { ConfigModule } from '@/config/config.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [ConfigModule, MetricsModule],
  providers: [WhisperService],
  exports: [WhisperService],
})
export class WhisperModule {}
