import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException } from '@nestjs/common';

describe('ProjectService (Multi-Tenant Scoping)', () => {
  let service: ProjectService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      project: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  describe('create', () => {
    it('should create project bound to organizationId', async () => {
      prisma.project.create.mockResolvedValue({
        id: 'proj-1',
        organizationId: 'org-tenant-a',
        name: 'Website Redesign',
        description: 'New landing page',
        createdById: 'user-1',
        createdBy: { id: 'user-1', fullName: 'Budi', email: 'budi@mail.com' },
      });

      const result = await service.create('org-tenant-a', 'user-1', {
        name: 'Website Redesign',
        description: 'New landing page',
      });

      expect(result.message).toBe('Project berhasil dibuat dalam workspace ini.');
      expect(result.project.organizationId).toBe('org-tenant-a');
      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-tenant-a',
          createdById: 'user-1',
          name: 'Website Redesign',
          description: 'New landing page',
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });
    });
  });

  describe('findAll', () => {
    it('should filter projects exclusively by organizationId (Tenant Data Isolation)', async () => {
      prisma.project.findMany.mockResolvedValue([
        { id: 'proj-1', organizationId: 'org-tenant-a', name: 'Project A1' },
        { id: 'proj-2', organizationId: 'org-tenant-a', name: 'Project A2' },
      ]);

      const result = await service.findAll('org-tenant-a');

      expect(result.total).toBe(2);
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-tenant-a', // Strict tenant isolation filter
        },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return project if it belongs to requesting tenant', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        organizationId: 'org-tenant-a',
        name: 'Project A1',
      });

      const result = await service.findOne('org-tenant-a', 'proj-1');
      expect(result.project.name).toBe('Project A1');
    });

    it('should throw NotFoundException if project belongs to another tenant (Preventing IDOR)', async () => {
      // Proj exists in DB but belongs to Tenant B, Tenant A requests it
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('org-tenant-a', 'proj-belonging-to-tenant-b'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
