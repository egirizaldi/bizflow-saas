import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Akses ditolak: Pengguna tidak terotentikasi.');
    }

    const orgId = request.headers['x-organization-id'];

    if (!orgId || typeof orgId !== 'string') {
      throw new BadRequestException(
        'Header x-organization-id wajib disertakan untuk mengakses resource tenant.',
      );
    }

    // Periksa keanggotaan user di dalam organisasi yang diminta
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE' || !membership.organization.isActive) {
      throw new ForbiddenException(
        'Akses ditolak: Anda bukan anggota aktif dari workspace organisasi ini.',
      );
    }

    // Injeksi konteks tenant ke dalam objek request
    request.tenant = {
      id: membership.organization.id,
      role: membership.role,
      status: membership.status,
      name: membership.organization.name,
      slug: membership.organization.slug,
    };

    return true;
  }
}
