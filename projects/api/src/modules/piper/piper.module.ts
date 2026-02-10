import { Module } from '@nestjs/common';
import { PiperService } from './piper.service';
import { ConfigModule } from '@/config/config.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [ConfigModule, MetricsModule],
  providers: [PiperService],
  exports: [PiperService],
})
export class PiperModule {}
