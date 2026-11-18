import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard/metrics')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getTenantMetrics(@CurrentTenant('id') organizationId: string) {
    return this.analyticsService.getTenantMetrics(organizationId);
  }

  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard)
  async getPlatformGlobalMetrics(@CurrentUser() user: any) {
    return this.analyticsService.getPlatformGlobalMetrics(user);
  }
}
