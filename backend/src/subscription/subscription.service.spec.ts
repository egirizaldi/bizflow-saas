import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      plan: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      subscription: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      organizationMember: {
        count: vi.fn(),
      },
      invitation: {
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  describe('getAllPlans', () => {
    it('should return active plans ordered by price', async () => {
      const mockPlans = [
        { id: '1', name: 'FREE', price: 0 },
        { id: '2', name: 'BUSINESS', price: 299000 },
      ];
      prisma.plan.findMany.mockResolvedValue(mockPlans);

      const result = await service.getAllPlans();
      expect(result).toEqual(mockPlans);
      expect(prisma.plan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      });
    });
  });

  describe('getCurrentSubscription', () => {
    it('should throw NotFoundException if subscription does not exist', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);

      await expect(
        service.getCurrentSubscription('org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate quota and days remaining accurately', async () => {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 25);

      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        plan: {
          id: 'plan-1',
          name: 'FREE',
          price: 0,
          maxMembers: 2,
          canExportReports: false,
          canViewAuditLogs: false,
        },
        organization: { id: 'org-1', name: 'Acme', slug: 'acme' },
      });

      prisma.organizationMember.count.mockResolvedValue(1);
      prisma.invitation.count.mockResolvedValue(0);

      const result = await service.getCurrentSubscription('org-1');
      expect(result.plan.name).toBe('FREE');
      expect(result.usage.activeMembersCount).toBe(1);
      expect(result.usage.remainingSlots).toBe(1);
      expect(result.usage.quotaPercentage).toBe(50);
      expect(result.usage.isLimitReached).toBe(false);
      expect(result.subscription.daysRemaining).toBeGreaterThanOrEqual(24);
    });
  });

  describe('switchPlan', () => {
    it('should throw ForbiddenException if user is not OWNER', async () => {
      await expect(
        service.switchPlan('org-1', 'user-1', Role.ADMIN, 'BUSINESS'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if target plan does not exist', async () => {
      prisma.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.switchPlan('org-1', 'user-1', Role.OWNER, 'NON_EXISTENT'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if active members exceed target plan maxMembers', async () => {
      prisma.plan.findUnique.mockResolvedValue({
        id: 'plan-free',
        name: 'FREE',
        price: 0,
        maxMembers: 2,
        isActive: true,
      });

      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        plan: { name: 'BUSINESS', maxMembers: 20 },
      });

      // 4 active members cannot downgrade to FREE (limit 2)
      prisma.organizationMember.count.mockResolvedValue(4);

      await expect(
        service.switchPlan('org-1', 'user-1', Role.OWNER, 'FREE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully switch plan when conditions are met', async () => {
      const targetPlan = {
        id: 'plan-biz',
        name: 'BUSINESS',
        price: 299000,
        maxMembers: 20,
        canExportReports: true,
        canViewAuditLogs: true,
        isActive: true,
      };

      prisma.plan.findUnique.mockResolvedValue(targetPlan);
      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        plan: { name: 'FREE', maxMembers: 2 },
      });
      prisma.organizationMember.count.mockResolvedValue(2);

      prisma.subscription.update.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        plan: targetPlan,
      });

      const result = await service.switchPlan('org-1', 'user-1', Role.OWNER, 'BUSINESS');
      expect(result.message).toContain('BUSINESS');
      expect(result.subscription.plan.name).toBe('BUSINESS');
      expect(prisma.subscription.update).toHaveBeenCalled();
    });
  });
});
