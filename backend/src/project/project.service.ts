import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        organizationId,
        createdById: userId,
        name: dto.name,
        description: dto.description || null,
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

    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'PROJECT_CREATED',
          targetType: 'Project',
          targetId: project.id,
          changesPayload: { name: project.name, description: project.description },
        },
      });
    } catch {}

    return {
      message: 'Project berhasil dibuat dalam workspace ini.',
      project,
    };
  }

  async findAll(organizationId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        organizationId, // ISOLASI TENANT: Hanya ambil data yang memiliki organizationId tenant ini
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

    return {
      message: 'Daftar project tenant berhasil didapatkan.',
      total: projects.length,
      organizationId,
      projects,
    };
  }

  async findOne(organizationId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId, // Mencegah IDOR: Project ID harus cocok dengan tenant context
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

    if (!project) {
      throw new NotFoundException('Project tidak ditemukan pada workspace ini.');
    }

    return {
      message: 'Detail project berhasil didapatkan.',
      project,
    };
  }

  async delete(organizationId: string, projectId: string) {
    // Validasi eksistensi data dalam scope tenant
    await this.findOne(organizationId, projectId);

    await this.prisma.project.delete({
      where: {
        id: projectId,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          action: 'PROJECT_DELETED',
          targetType: 'Project',
          targetId: projectId,
        },
      });
    } catch {}

    return {
      message: 'Project berhasil dihapus dari workspace.',
    };
  }
}
