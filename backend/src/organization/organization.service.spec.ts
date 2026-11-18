import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationService } from './organization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException } from '@nestjs/common';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      organization: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      organizationMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      plan: {
        findUnique: vi.fn(),
      },
      subscription: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        return cb(prisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  describe('create', () => {
    it('should create an organization with generated slug and set user as OWNER', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue({
        id: 'org-uuid-1',
        name: 'PT Maju Jaya',
        slug: 'pt-maju-jaya',
        billingEmail: 'admin@majujaya.com',
        logoUrl: null,
        isActive: true,
      });
      prisma.plan.findUnique.mockResolvedValue({ id: 'plan-free-id', name: 'FREE' });

      const result = await service.create('user-uuid-1', {
        name: 'PT Maju Jaya',
        billingEmail: 'admin@majujaya.com',
      });

      expect(result.message).toBe('Organisasi berhasil dibuat.');
      expect(result.organization.slug).toBe('pt-maju-jaya');
      expect(result.organization.role).toBe('OWNER');
      expect(prisma.organizationMember.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-uuid-1',
          userId: 'user-uuid-1',
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });
    });

    it('should generate a unique slug if slug already exists', async () => {
      // First slug exists, second does not
      prisma.organization.findUnique
        .mockResolvedValueOnce({ id: 'existing-org' })
        .mockResolvedValueOnce(null);

      prisma.organization.create.mockResolvedValue({
        id: 'org-uuid-2',
        name: 'PT Maju Jaya',
        slug: 'pt-maju-jaya-1',
        isActive: true,
      });

      const result = await service.create('user-uuid-1', {
        name: 'PT Maju Jaya',
      });

      expect(result.organization.slug).toBe('pt-maju-jaya-1');
    });
  });

  describe('getUserOrganizations', () => {
    it('should return all organizations user is part of', async () => {
      prisma.organizationMember.findMany.mockResolvedValue([
        {
          role: 'OWNER',
          joinedAt: new Date(),
          organization: {
            id: 'org-1',
            name: 'PT Maju Jaya',
            slug: 'pt-maju-jaya',
            logoUrl: null,
            billingEmail: null,
            isActive: true,
            _count: { members: 5 },
            subscription: { plan: { name: 'BUSINESS' } },
          },
        },
        {
          role: 'STAFF',
          joinedAt: new Date(),
          organization: {
            id: 'org-2',
            name: 'CV Berkah Abadi',
            slug: 'cv-berkah-abadi',
            logoUrl: null,
            billingEmail: null,
            isActive: true,
            _count: { members: 3 },
            subscription: null,
          },
        },
      ]);

      const result = await service.getUserOrganizations('user-uuid-1');

      expect(result.organizations).toHaveLength(2);
      expect(result.organizations[0].name).toBe('PT Maju Jaya');
      expect(result.organizations[0].role).toBe('OWNER');
      expect(result.organizations[0].plan).toBe('BUSINESS');
      expect(result.organizations[1].name).toBe('CV Berkah Abadi');
      expect(result.organizations[1].role).toBe('STAFF');
      expect(result.organizations[1].plan).toBe('FREE');
    });
  });

  describe('getOrganizationById', () => {
    it('should return organization detail if user is active member', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        role: 'ADMIN',
        status: 'ACTIVE',
        joinedAt: new Date(),
        organization: {
          id: 'org-1',
          name: 'PT Maju Jaya',
          slug: 'pt-maju-jaya',
          logoUrl: null,
          billingEmail: null,
          isActive: true,
          _count: { members: 4 },
          subscription: { plan: { name: 'STARTER' } },
        },
      });

      const result = await service.getOrganizationById('user-uuid-1', 'org-1');
      expect(result.organization.name).toBe('PT Maju Jaya');
      expect(result.organization.role).toBe('ADMIN');
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.getOrganizationById('user-uuid-1', 'org-unknown'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should allow OWNER to update organization profile', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        role: 'OWNER',
        status: 'ACTIVE',
      });
      prisma.organization.update.mockResolvedValue({
        id: 'org-1',
        name: 'PT Maju Jaya Baru',
        billingEmail: 'billing@majujaya.com',
      });

      const result = await service.update('user-uuid-1', 'org-1', {
        name: 'PT Maju Jaya Baru',
        billingEmail: 'billing@majujaya.com',
      });

      expect(result.organization.name).toBe('PT Maju Jaya Baru');
    });

    it('should throw ForbiddenException if STAFF attempts to update organization', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        role: 'STAFF',
        status: 'ACTIVE',
      });

      await expect(
        service.update('user-uuid-1', 'org-1', { name: 'Hack Name' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
