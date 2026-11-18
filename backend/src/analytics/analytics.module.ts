import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, TenantGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
