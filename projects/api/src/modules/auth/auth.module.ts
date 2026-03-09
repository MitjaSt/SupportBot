import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@/config/config.module';
import { MetricsModule } from '@/modules/metrics/metrics.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [PassportModule, ConfigModule, MetricsModule],
  providers: [JwtStrategy, JwtAuthGuard, PermissionsGuard],
  exports: [JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
