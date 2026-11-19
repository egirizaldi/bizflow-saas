import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard.js';
import { RequireFeature } from '../subscription/decorators/require-feature.decorator.js';
import { QueryAuditLogDto } from './dto/query-audit-log.dto.js';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard)
@RequireFeature('canViewAuditLogs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async getLogs(@Request() req: any, @Query() query: QueryAuditLogDto) {
    return this.auditService.getLogs(req.tenant.organizationId, query);
  }

  @Get('actions')
  async getActions(@Request() req: any) {
    return this.auditService.getDistinctActions(req.tenant.organizationId);
  }
}
