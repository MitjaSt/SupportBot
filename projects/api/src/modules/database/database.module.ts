import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { SessionRepository } from './session.repository';

@Module({
  providers: [DatabaseService, SessionRepository],
  exports: [DatabaseService, SessionRepository],
})
export class DatabaseModule {}
