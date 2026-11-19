import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard.js';
import { RequireFeature } from '../subscription/decorators/require-feature.decorator.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';
import { ReportService } from './report.service.js';

@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard, SubscriptionGuard)
export class ReportController {
  constructor(private reportService: ReportService) {}

  /**
   * Unduh Laporan Proyek dalam Format Excel (.xlsx)
   */
  @Get('projects/excel')
  @RequireFeature('canExportReports')
  async downloadProjectsExcel(
    @CurrentTenant() organizationId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.reportService.exportProjectsExcel(organizationId);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.status(HttpStatus.OK).end(buffer);
  }

  /**
   * Unduh Laporan Audit Log dalam Format Excel (.xlsx)
   */
  @Get('audit-logs/excel')
  @RequireFeature('canExportReports')
  async downloadAuditLogsExcel(
    @CurrentTenant() organizationId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.reportService.exportAuditLogsExcel(organizationId);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.status(HttpStatus.OK).end(buffer);
  }

  /**
   * Unduh Kuitansi / Faktur Invoice Resmi dalam Format PDF
   */
  @Get('invoices/:id/pdf')
  @RequireFeature('canExportReports')
  async downloadInvoicePdf(
    @CurrentTenant() organizationId: string,
    @Param('id') invoiceId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.reportService.generateInvoicePdf(
      organizationId,
      invoiceId,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.status(HttpStatus.OK).end(buffer);
  }
}
