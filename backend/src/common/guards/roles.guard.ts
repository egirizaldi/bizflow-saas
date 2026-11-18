import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Jika endpoint tidak memiliki dekorator @Roles, izinkan akses
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenant = request.tenant;

    // Platform Super Admin memiliki izin bypass wewenang
    if (user?.isSuperAdmin) {
      return true;
    }

    if (!tenant || !tenant.role) {
      throw new ForbiddenException(
        'Akses ditolak: Konteks wewenang organisasi tidak ditemukan.',
      );
    }

    const hasRole = requiredRoles.includes(tenant.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Akses ditolak: Peran ${tenant.role} tidak memiliki wewenang untuk tindakan ini. Wewenang yang dibutuhkan: [${requiredRoles.join(', ')}].`,
      );
    }

    return true;
  }
}
