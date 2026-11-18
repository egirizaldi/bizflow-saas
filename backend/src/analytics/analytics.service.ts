import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getTenantMetrics(organizationId: string) {
    // 1. Hitung total anggota aktif
    const totalMembers = await this.prisma.organizationMember.count({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
    });

    // 2. Hitung total project
    const totalProjects = await this.prisma.project.count({
      where: {
        organizationId,
      },
    });

    // 3. Hitung undangan aktif yang masih pending
    const pendingInvitations = await this.prisma.invitation.count({
      where: {
        organizationId,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // 4. Ambil subscription & plan saat ini
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    const subscription = organization?.subscription;
    const plan = subscription?.plan;

    let daysRemaining = 30;
    if (subscription?.currentPeriodEnd) {
      const diffTime = new Date(subscription.currentPeriodEnd).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // 5. Distribusi peran (RBAC distribution)
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: { role: true },
    });

    const roleCounts: Record<string, number> = {
      OWNER: 0,
      ADMIN: 0,
      MANAGER: 0,
      STAFF: 0,
    };

    members.forEach((m) => {
      if (roleCounts[m.role] !== undefined) {
        roleCounts[m.role]++;
      }
    });

    const roleDistribution = Object.keys(roleCounts).map((role) => ({
      name: role,
      count: roleCounts[role],
    }));

    // 6. Tren aktivitas 6 bulan terakhir (Project creation trend)
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthlyActivityTrend = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const count = await this.prisma.project.count({
        where: {
          organizationId,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });

      monthlyActivityTrend.push({
        month: `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
        projects: count,
      });
    }

    return {
      message: 'Metrik analitik tenant berhasil didapatkan.',
      organizationId,
      metrics: {
        totalMembers,
        maxMembersQuota: plan?.maxMembers || 5,
        totalProjects,
        pendingInvitations,
        subscription: {
          planName: plan?.name || 'FREE',
          price: plan ? Number(plan.price) : 0,
          status: subscription?.status || 'ACTIVE',
          daysRemaining,
          canExportReports: plan?.canExportReports || false,
          canViewAuditLogs: plan?.canViewAuditLogs || false,
        },
        roleDistribution,
        monthlyActivityTrend,
      },
    };
  }

  async getPlatformGlobalMetrics(user: any) {
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Akses ditolak: Hanya Platform Super Admin yang dapat mengakses analitik global.');
    }

    const [totalUsers, totalOrganizations, activeOrgs, totalProjects] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.project.count(),
    ]);

    const subscriptions = await this.prisma.subscription.findMany({
      include: { plan: true },
    });

    const planStats: Record<string, number> = {};
    subscriptions.forEach((sub) => {
      const name = sub.plan.name;
      planStats[name] = (planStats[name] || 0) + 1;
    });

    return {
      message: 'Metrik analitik platform global berhasil didapatkan.',
      metrics: {
        totalUsers,
        totalOrganizations,
        activeOrganizations: activeOrgs,
        totalProjects,
        planDistribution: Object.keys(planStats).map((name) => ({
          plan: name,
          count: planStats[name],
        })),
      },
    };
  }
}
