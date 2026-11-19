import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException } from '@nestjs/common';

describe('ReportService (Excel & PDF Reports Export)', () => {
  let service: ReportService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      organization: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'org-1',
          name: 'Tech Corp',
          slug: 'tech-corp',
          billingEmail: 'billing@techcorp.com',
        }),
      },
      project: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'proj-1',
            name: 'Website Redesign',
            description: 'Redesign portal web utama',
            createdAt: new Date('2026-01-15T08:00:00Z'),
            updatedAt: new Date('2026-01-20T10:00:00Z'),
          },
          {
            id: 'proj-2',
            name: 'Mobile App API',
            description: null,
            createdAt: new Date('2026-02-01T09:00:00Z'),
            updatedAt: new Date('2026-02-05T11:00:00Z'),
          },
        ]),
      },
      auditLog: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'log-1',
            action: 'PROJECT_CREATED',
            targetType: 'Project',
            targetId: 'proj-1',
            changesPayload: { name: 'Website Redesign' },
            createdAt: new Date('2026-01-15T08:00:00Z'),
            user: { fullName: 'Egi Rizaldi', email: 'egi@bizflow.com' },
          },
        ]),
      },
      invoice: {
        findFirst: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
  });

  describe('exportProjectsExcel', () => {
    it('should generate a valid Excel xlsx buffer containing project rows', async () => {
      const result = await service.exportProjectsExcel('org-1');

      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        select: { name: true, slug: true },
      });
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { createdAt: 'desc' },
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.filename).toContain('projects-tech-corp-');
      expect(result.filename).toMatch(/\.xlsx$/);
    });
  });

  describe('exportAuditLogsExcel', () => {
    it('should generate a valid Excel xlsx buffer containing audit logs', async () => {
      const result = await service.exportAuditLogsExcel('org-1');

      expect(prisma.auditLog.findMany).toHaveBeenCalled();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.filename).toContain('audit-trail-tech-corp-');
      expect(result.filename).toMatch(/\.xlsx$/);
    });
  });

  describe('generateInvoicePdf', () => {
    it('should throw NotFoundException if invoice does not exist', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.generateInvoicePdf('org-1', 'non-existent-inv'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should generate a valid PDF buffer for an existing invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-123',
        invoiceNumber: 'INV/20260218/BIZFLOW/123456',
        amount: 299000,
        issueDate: new Date('2026-02-18T10:00:00Z'),
        organization: {
          name: 'Tech Corp',
          slug: 'tech-corp',
          billingEmail: 'billing@techcorp.com',
        },
        payment: {
          orderId: 'ORDER-123456',
          paymentType: 'bank_transfer',
          subscription: {
            plan: {
              name: 'STARTER',
            },
          },
        },
      });

      const result = await service.generateInvoicePdf('org-1', 'inv-123');

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      // PDF header standard starts with %PDF-
      expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF');
      expect(result.filename).toBe('Invoice-INV-20260218-BIZFLOW-123456.pdf');
    });
  });
});
