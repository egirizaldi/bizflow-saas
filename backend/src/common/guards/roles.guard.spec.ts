import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('RolesGuard (RBAC)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: vi.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockContext = (tenantRole?: Role, isSuperAdmin = false) => {
    const request: any = {
      user: { id: 'user-1', isSuperAdmin },
      tenant: tenantRole ? { id: 'org-1', role: tenantRole } : null,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('should allow access if route has no @Roles decorator', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext(Role.STAFF);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow platform Super Admin to bypass role restrictions', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER]);
    const context = createMockContext(Role.STAFF, true);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user has role STAFF on an OWNER/ADMIN endpoint', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER, Role.ADMIN]);
    const context = createMockContext(Role.STAFF);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access if user has role ADMIN and endpoint allows [OWNER, ADMIN]', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER, Role.ADMIN]);
    const context = createMockContext(Role.ADMIN);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has role OWNER', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER]);
    const context = createMockContext(Role.OWNER);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if tenant context is missing', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.OWNER]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
