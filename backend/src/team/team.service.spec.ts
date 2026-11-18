import { Test, TestingModule } from '@nestjs/testing';
import { TeamService } from './team.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

describe('TeamService (Team Management & Invitations)', () => {
  let service: TeamService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
      },
      organizationMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      invitation: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
  });

  describe('inviteMember', () => {
    it('should throw BadRequestException if role is OWNER', async () => {
      await expect(
        service.inviteMember('org-1', 'user-owner', 'OWNER', {
          email: 'new@mail.com',
          role: Role.OWNER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user is already an active member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2', email: 'andi@mail.com' });
      prisma.organizationMember.findUnique.mockResolvedValue({
        status: 'ACTIVE',
      });

      await expect(
        service.inviteMember('org-1', 'user-owner', 'OWNER', {
          email: 'andi@mail.com',
          role: Role.STAFF,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if active pending invitation already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue({ id: 'invite-active' });

      await expect(
        service.inviteMember('org-1', 'user-owner', 'OWNER', {
          email: 'andi@mail.com',
          role: Role.STAFF,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create invitation with valid token and 48-hour expiration', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue({
        id: 'invite-1',
        email: 'andi@mail.com',
        role: Role.MANAGER,
        token: 'mock-hex-token',
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
        organization: { id: 'org-1', name: 'PT Maju Jaya', slug: 'pt-maju-jaya' },
      });

      const result = await service.inviteMember('org-1', 'user-owner', 'OWNER', {
        email: 'andi@mail.com',
        role: Role.MANAGER,
      });

      expect(result.message).toBe('Undangan anggota tim berhasil dibuat.');
      expect(result.invitation.email).toBe('andi@mail.com');
      expect(result.invitation.role).toBe(Role.MANAGER);
      expect(result.invitation.organizationName).toBe('PT Maju Jaya');
    });
  });

  describe('acceptInvitation', () => {
    it('should throw NotFoundException if invitation token is invalid', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInvitation('user-1', 'budi@mail.com', 'invalid-token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invitation is already ACCEPTED', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        status: 'ACCEPTED',
      });

      await expect(
        service.acceptInvitation('user-1', 'budi@mail.com', 'used-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token is expired', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 10000), // Expired in past
      });

      await expect(
        service.acceptInvitation('user-1', 'budi@mail.com', 'expired-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user email does not match invitation email', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'PENDING',
        email: 'invited@mail.com',
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(
        service.acceptInvitation('user-1', 'different-person@mail.com', 'token-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should accept invitation and link user as member', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-1',
        email: 'invited@mail.com',
        role: Role.ADMIN,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 100000),
        organization: { id: 'org-1', name: 'PT Maju Jaya', slug: 'pt-maju-jaya' },
      });

      const result = await service.acceptInvitation(
        'user-1',
        'invited@mail.com',
        'token-1',
      );

      expect(result.message).toContain('Selamat!');
      expect(result.organization.role).toBe(Role.ADMIN);
    });
  });

  describe('updateMemberRole', () => {
    it('should throw ForbiddenException if promoting to OWNER', async () => {
      await expect(
        service.updateMemberRole('org-1', 'user-owner', 'OWNER', 'member-1', Role.OWNER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if target is the OWNER', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-owner',
        organizationId: 'org-1',
        role: Role.OWNER,
      });

      await expect(
        service.updateMemberRole('org-1', 'user-owner', 'OWNER', 'member-owner', Role.ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if ADMIN attempts to change another ADMIN', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-admin-2',
        organizationId: 'org-1',
        userId: 'user-admin-2',
        role: Role.ADMIN,
      });

      await expect(
        service.updateMemberRole(
          'org-1',
          'user-admin-1',
          'ADMIN',
          'member-admin-2',
          Role.STAFF,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully update member role when authorized', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-staff',
        organizationId: 'org-1',
        userId: 'user-staff',
        role: Role.STAFF,
      });
      prisma.organizationMember.update.mockResolvedValue({
        id: 'member-staff',
        role: Role.MANAGER,
      });

      const result = await service.updateMemberRole(
        'org-1',
        'user-owner',
        'OWNER',
        'member-staff',
        Role.MANAGER,
      );

      expect(result.member.role).toBe(Role.MANAGER);
    });
  });

  describe('removeMember', () => {
    it('should throw ForbiddenException if attempting to remove OWNER', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-owner',
        organizationId: 'org-1',
        role: Role.OWNER,
        userId: 'user-owner',
      });

      await expect(
        service.removeMember('org-1', 'user-admin', 'ADMIN', 'member-owner'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if user tries to remove self', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-admin',
        organizationId: 'org-1',
        role: Role.ADMIN,
        userId: 'user-admin-1',
      });

      await expect(
        service.removeMember('org-1', 'user-admin-1', 'ADMIN', 'member-admin'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if ADMIN tries to remove another ADMIN', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-admin-2',
        organizationId: 'org-1',
        role: Role.ADMIN,
        userId: 'user-admin-2',
      });

      await expect(
        service.removeMember('org-1', 'user-admin-1', 'ADMIN', 'member-admin-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete member successfully when authorized', async () => {
      prisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-staff',
        organizationId: 'org-1',
        role: Role.STAFF,
        userId: 'user-staff',
      });
      prisma.organizationMember.delete.mockResolvedValue({});

      const result = await service.removeMember(
        'org-1',
        'user-owner',
        'OWNER',
        'member-staff',
      );

      expect(result.message).toBe('Anggota tim berhasil dikeluarkan dari workspace.');
    });
  });
});
