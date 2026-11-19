import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '@prisma/client';
import { SwitchPlanDto } from './dto/switch-plan.dto.js';
import { SubscriptionGuard } from './guards/subscription.guard.js';
import { RequireFeature } from './decorators/require-feature.decorator.js';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get('plans')
  async getPlans() {
    return this.subscriptionService.getAllPlans();
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('current')
  async getCurrentSubscription(@Request() req: any) {
    return this.subscriptionService.getCurrentSubscription(
      req.tenant.organizationId,
    );
  }

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(Role.OWNER)
  @Post('switch')
  async switchPlan(@Request() req: any, @Body() dto: SwitchPlanDto) {
    return this.subscriptionService.switchPlan(
      req.tenant.organizationId,
      req.user.id,
      req.tenant.role,
      dto.planName,
    );
  }

  // Endpoint untuk validasi SubscriptionGuard: Fitur Audit Logs (khusus Business & Enterprise)
  @UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard)
  @RequireFeature('canViewAuditLogs')
  @Get('features/audit-logs')
  async testAuditLogsAccess(@Request() req: any) {
    return {
      success: true,
      feature: 'canViewAuditLogs',
      organizationId: req.tenant.organizationId,
      message:
        'Akses fitur Audit Logs diizinkan untuk paket langganan organisasi Anda.',
    };
  }

  // Endpoint untuk validasi SubscriptionGuard: Fitur Export Laporan (khusus Business & Enterprise)
  @UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard)
  @RequireFeature('canExportReports')
  @Get('features/export-reports')
  async testExportReportsAccess(@Request() req: any) {
    return {
      success: true,
      feature: 'canExportReports',
      organizationId: req.tenant.organizationId,
      message:
        'Akses fitur Export Laporan diizinkan untuk paket langganan organisasi Anda.',
    };
  }
}
