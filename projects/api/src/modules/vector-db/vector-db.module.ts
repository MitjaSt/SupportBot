import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/modules/database/database.module';
import { VectorDbService } from './vector-db.service';

@Module({
  imports: [DatabaseModule],
  providers: [VectorDbService],
  exports: [VectorDbService],
})
export class VectorDbModule {}
