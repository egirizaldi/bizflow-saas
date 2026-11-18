import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    let baseSlug = dto.slug
      ? this.slugify(dto.slug)
      : this.slugify(dto.name);

    let finalSlug = baseSlug;
    let counter = 1;

    // Pastikan slug unik
    while (await this.prisma.organization.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Eksekusi atomik dalam Prisma Transaction
    const organization = await this.prisma.$transaction(async (tx) => {
      // 1. Buat data organisasi
      const newOrg = await tx.organization.create({
        data: {
          name: dto.name,
          slug: finalSlug,
          billingEmail: dto.billingEmail || null,
          logoUrl: dto.logoUrl || null,
        },
      });

      // 2. Daftarkan pembuat organisasi sebagai OWNER
      await tx.organizationMember.create({
        data: {
          organizationId: newOrg.id,
          userId,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });

      // 3. Daftarkan subscription Free Tier default (jika ada plan Free)
      const freePlan = await tx.plan.findUnique({ where: { name: 'FREE' } });
      if (freePlan) {
        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await tx.subscription.create({
          data: {
            organizationId: newOrg.id,
            planId: freePlan.id,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: nextMonth,
          },
        });
      }

      return newOrg;
    });

    return {
      message: 'Organisasi berhasil dibuat.',
      organization: {
        ...organization,
        role: 'OWNER',
      },
    };
  }

  async getUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        organization: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return {
      message: 'Daftar organisasi berhasil didapatkan.',
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        logoUrl: m.organization.logoUrl,
        billingEmail: m.organization.billingEmail,
        role: m.role,
        memberCount: m.organization._count.members,
        plan: m.organization.subscription?.plan?.name || 'FREE',
        isActive: m.organization.isActive,
        joinedAt: m.joinedAt,
      })),
    };
  }

  async getOrganizationById(userId: string, orgId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
      include: {
        organization: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('Akses ditolak: Anda bukan anggota aktif organisasi ini.');
    }

    return {
      message: 'Detail organisasi berhasil didapatkan.',
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        logoUrl: membership.organization.logoUrl,
        billingEmail: membership.organization.billingEmail,
        isActive: membership.organization.isActive,
        role: membership.role,
        memberCount: membership.organization._count.members,
        plan: membership.organization.subscription?.plan || null,
        joinedAt: membership.joinedAt,
      },
    };
  }

  async update(userId: string, orgId: string, dto: UpdateOrganizationDto) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('Akses ditolak: Anda bukan anggota organisasi ini.');
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ForbiddenException('Hanya Owner atau Admin yang berhak mengubah informasi organisasi.');
    }

    const updatedOrg = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: dto.name,
        billingEmail: dto.billingEmail,
        logoUrl: dto.logoUrl,
      },
    });

    return {
      message: 'Profil organisasi berhasil diperbarui.',
      organization: updatedOrg,
    };
  }

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '') || 'workspace';
  }
}
