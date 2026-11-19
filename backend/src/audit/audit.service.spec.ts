import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AuditService (Audit Logging & Activity Trail)', () => {
  let service: AuditService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('recordLog', () => {
    it('should create an audit log entry', async () => {
      const mockLog = {
        id: 'log-1',
        organizationId: 'org-1',
        userId: 'user-1',
        action: 'PROJECT_CREATED',
        targetType: 'Project',
        targetId: 'proj-1',
      };
      prisma.auditLog.create.mockResolvedValue(mockLog);

      const result = await service.recordLog({
        organizationId: 'org-1',
        userId: 'user-1',
        action: 'PROJECT_CREATED',
        targetType: 'Project',
        targetId: 'proj-1',
        changesPayload: { name: 'New Project' },
      });

      expect(result).toEqual(mockLog);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should catch errors gracefully without throwing', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB connection failed'));

      const result = await service.recordLog({
        organizationId: 'org-1',
        action: 'FAILED_ACTION',
      });

      expect(result).toBeNull();
    });
  });

  describe('getLogs', () => {
    it('should return paginated audit logs with user details', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'MEMBER_INVITED',
          targetType: 'Invitation',
          user: { fullName: 'Egi Rizaldi', email: 'egi@bizflow.com' },
          createdAt: new Date(),
        },
      ];

      prisma.auditLog.count.mockResolvedValue(1);
      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getLogs('org-1', { page: 1, limit: 10 });

      expect(result.logs).toEqual(mockLogs);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(prisma.auditLog.findMany).toHaveBeenCalled();
    });

    it('should apply action filter when specified', async () => {
      prisma.auditLog.count.mockResolvedValue(0);
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.getLogs('org-1', {
        page: 1,
        limit: 10,
        action: 'PAYMENT_SUCCESS',
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            action: 'PAYMENT_SUCCESS',
          }),
        }),
      );
    });

    it('should apply search filter when search keyword provided', async () => {
      prisma.auditLog.count.mockResolvedValue(0);
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.getLogs('org-1', {
        page: 1,
        limit: 10,
        search: 'INVITED',
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('getDistinctActions', () => {
    it('should return unique action names', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        { action: 'MEMBER_INVITED' },
        { action: 'PAYMENT_SUCCESS' },
      ]);

      const result = await service.getDistinctActions('org-1');
      expect(result).toEqual(['MEMBER_INVITED', 'PAYMENT_SUCCESS']);
    });
  });
});
