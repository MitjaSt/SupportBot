import { Module } from '@nestjs/common';
import { ContactCollectionService } from './contact-collection.service';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [ContactCollectionService],
  exports: [ContactCollectionService],
})
export class ContactCollectionModule {}
