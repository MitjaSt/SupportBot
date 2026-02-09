import { Module } from '@nestjs/common';
import { PiperService } from './piper.service';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [PiperService],
  exports: [PiperService],
})
export class PiperModule {}
