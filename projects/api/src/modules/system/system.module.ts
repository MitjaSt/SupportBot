import { ConfigModule } from '@/config/config.module';
import { DatabaseModule } from '@/modules/database/database.module';
import { MetricsModule } from '@/modules/metrics/metrics.module';
import { VectorDbModule } from '@/modules/vector-db/vector-db.module';
import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [ConfigModule, DatabaseModule, VectorDbModule, MetricsModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
