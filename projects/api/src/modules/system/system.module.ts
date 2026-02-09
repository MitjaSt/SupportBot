import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { DatabaseModule } from '@/modules/database/database.module';
import { VectorDbModule } from '@/modules/vector-db/vector-db.module';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [ConfigModule, DatabaseModule, VectorDbModule],
  controllers: [SystemController],
})
export class SystemModule {}
