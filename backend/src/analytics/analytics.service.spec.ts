import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException } from '@nestjs/common';

describe('AnalyticsService (Dashboard Metrics & Global Stats)', () => {
  let service: AnalyticsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      organizationMember: {
        count: vi.fn().mockResolvedValue(5),
        findMany: vi.fn().mockResolvedValue([
          { role: 'OWNER' },
          { role: 'ADMIN' },
          { role: 'STAFF' },
          { role: 'STAFF' },
          { role: 'STAFF' },
        ]),
      },
      project: {
        count: vi.fn().mockResolvedValue(3),
      },
      invitation: {
        count: vi.fn().mockResolvedValue(1),
      },
      organization: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'org-1',
          name: 'PT Maju Jaya',
          subscription: {
            status: 'ACTIVE',
            currentPeriodEnd: new Date(Date.now() + 15 * 24 * 3600 * 1000),
            plan: {
              name: 'STARTER',
              price: 99000,
              maxMembers: 5,
              canExportReports: false,
              canViewAuditLogs: false,
            },
          },
        }),
        count: vi.fn().mockResolvedValue(10),
      },
      user: {
        count: vi.fn().mockResolvedValue(25),
      },
      subscription: {
        findMany: vi.fn().mockResolvedValue([
          { plan: { name: 'FREE' } },
          { plan: { name: 'STARTER' } },
          { plan: { name: 'BUSINESS' } },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getTenantMetrics', () => {
    it('should aggregate tenant dashboard metrics correctly', async () => {
      const result = await service.getTenantMetrics('org-1');

      expect(result.message).toBe('Metrik analitik tenant berhasil didapatkan.');
      expect(result.metrics.totalMembers).toBe(5);
      expect(result.metrics.totalProjects).toBe(3);
      expect(result.metrics.pendingInvitations).toBe(1);
      expect(result.metrics.subscription.planName).toBe('STARTER');
      expect(result.metrics.maxMembersQuota).toBe(5);
      expect(result.metrics.roleDistribution).toHaveLength(4);
      expect(result.metrics.monthlyActivityTrend).toHaveLength(6);
    });
  });

  describe('getPlatformGlobalMetrics', () => {
    it('should allow Super Admin to view global SaaS platform metrics', async () => {
      const result = await service.getPlatformGlobalMetrics({ isSuperAdmin: true });

      expect(result.metrics.totalUsers).toBe(25);
      expect(result.metrics.totalOrganizations).toBe(10);
      expect(result.metrics.planDistribution).toHaveLength(3);
    });

    it('should throw ForbiddenException if user is not Super Admin', async () => {
      await expect(
        service.getPlatformGlobalMetrics({ isSuperAdmin: false }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
