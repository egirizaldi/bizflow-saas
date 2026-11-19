import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  PlanFeature,
  REQUIRE_FEATURE_KEY,
} from '../decorators/require-feature.decorator.js';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<PlanFeature>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super Admin platform dapat mengakses semua fitur
    if (user?.isSuperAdmin) {
      return true;
    }

    const organizationId =
      request.tenant?.organizationId ||
      request.headers['x-organization-id'] ||
      request.params?.id;

    if (!organizationId) {
      throw new ForbiddenException(
        'Header x-organization-id atau konteks tenant diperlukan untuk verifikasi fitur paket.',
      );
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Organisasi tidak memiliki langganan aktif. Silakan berlangganan terlebih dahulu.',
      );
    }

    const featureNameMap: Record<PlanFeature, string> = {
      canExportReports: 'Export Laporan (PDF/Excel)',
      canViewAuditLogs: 'Audit Logs & Riwayat Keamanan',
    };

    const hasAccess = Boolean(subscription.plan?.[requiredFeature]);

    if (!hasAccess) {
      const friendlyName = featureNameMap[requiredFeature] || requiredFeature;
      throw new ForbiddenException(
        `Fitur "${friendlyName}" memerlukan paket Business atau lebih tinggi. Paket saat ini: ${subscription.plan?.name || 'FREE'}.`,
      );
    }

    return true;
  }
}
