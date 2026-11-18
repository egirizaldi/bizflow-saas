import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { Role } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async inviteMember(
    organizationId: string,
    currentUserId: string,
    currentUserRole: string,
    dto: InviteMemberDto,
  ) {
    if (dto.role === Role.OWNER) {
      throw new BadRequestException('Role Owner tidak dapat diberikan melalui undangan.');
    }

    const email = dto.email.toLowerCase().trim();

    // 1. Cek apakah user sudah terdaftar dan menjadi anggota aktif
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const isMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: existingUser.id,
          },
        },
      });

      if (isMember && isMember.status === 'ACTIVE') {
        throw new ConflictException('Pengguna dengan email ini sudah menjadi anggota aktif organisasi.');
      }
    }

    // 2. Cek apakah ada undangan aktif yang belum kedaluwarsa
    const existingInvite = await this.prisma.invitation.findFirst({
      where: {
        organizationId,
        email,
        status: 'PENDING',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvite) {
      throw new ConflictException('Undangan aktif untuk email ini sudah pernah dikirim.');
    }

    // 3. Buat token undangan unik (kedaluwarsa 48 jam)
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId,
        email,
        role: dto.role,
        token,
        expiresAt,
        invitedById: currentUserId,
        status: 'PENDING',
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return {
      message: 'Undangan anggota tim berhasil dibuat.',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
        organizationName: invitation.organization.name,
      },
    };
  }

  async getInvitations(organizationId: string) {
    const invitations = await this.prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    return {
      message: 'Daftar undangan berhasil didapatkan.',
      total: invitations.length,
      invitations,
    };
  }

  async acceptInvitation(currentUserId: string, currentUserEmail: string, token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Undangan tidak ditemukan atau token tidak valid.');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Undangan ini sudah pernah digunakan atau dibatalkan.');
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Masa berlaku token undangan telah kedaluwarsa.');
    }

    // Validasi email
    if (invitation.email.toLowerCase() !== currentUserEmail.toLowerCase()) {
      throw new ForbiddenException(
        `Undangan ini ditujukan untuk email ${invitation.email}, bukan ${currentUserEmail}.`,
      );
    }

    // Hubungkan user ke organisasi secara atomik
    await this.prisma.$transaction(async (tx) => {
      await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: currentUserId,
          },
        },
        create: {
          organizationId: invitation.organizationId,
          userId: currentUserId,
          role: invitation.role,
          status: 'ACTIVE',
        },
        update: {
          role: invitation.role,
          status: 'ACTIVE',
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });
    });

    return {
      message: `Selamat! Anda berhasil bergabung ke ${invitation.organization.name}.`,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
        role: invitation.role,
      },
    };
  }

  async getMembers(organizationId: string) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    // Sort: OWNER first, then ADMIN, MANAGER, STAFF
    const rolePriority: Record<string, number> = {
      OWNER: 1,
      ADMIN: 2,
      MANAGER: 3,
      STAFF: 4,
    };

    const sortedMembers = members.sort(
      (a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99),
    );

    return {
      message: 'Daftar anggota tim berhasil didapatkan.',
      total: sortedMembers.length,
      members: sortedMembers.map((m) => ({
        memberId: m.id,
        userId: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
      })),
    };
  }

  async updateMemberRole(
    organizationId: string,
    currentUserId: string,
    currentUserRole: string,
    memberId: string,
    newRole: Role,
  ) {
    if (newRole === Role.OWNER) {
      throw new ForbiddenException('Peran Owner tidak dapat dialihkan melalui menu ini.');
    }

    const targetMember = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.organizationId !== organizationId) {
      throw new NotFoundException('Anggota tim tidak ditemukan pada organisasi ini.');
    }

    if (targetMember.role === Role.OWNER) {
      throw new ForbiddenException('Peran Owner organisasi tidak dapat diubah.');
    }

    if (currentUserRole === 'ADMIN' && targetMember.role === Role.ADMIN && targetMember.userId !== currentUserId) {
      throw new ForbiddenException('Admin tidak berhak mengubah wewenang sesama Admin.');
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: newRole },
    });

    return {
      message: 'Peran anggota berhasil diperbarui.',
      member: updated,
    };
  }

  async removeMember(
    organizationId: string,
    currentUserId: string,
    currentUserRole: string,
    memberId: string,
  ) {
    const targetMember = await this.prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.organizationId !== organizationId) {
      throw new NotFoundException('Anggota tim tidak ditemukan pada organisasi ini.');
    }

    if (targetMember.role === Role.OWNER) {
      throw new ForbiddenException('Pemilik organisasi (Owner) tidak dapat dikeluarkan.');
    }

    if (targetMember.userId === currentUserId) {
      throw new BadRequestException('Anda tidak dapat mengeluarkan diri sendiri.');
    }

    if (currentUserRole === 'ADMIN' && targetMember.role === Role.ADMIN) {
      throw new ForbiddenException('Admin tidak berhak mengeluarkan sesama Admin.');
    }

    await this.prisma.organizationMember.delete({
      where: { id: memberId },
    });

    return {
      message: 'Anggota tim berhasil dikeluarkan dari workspace.',
    };
  }
}
