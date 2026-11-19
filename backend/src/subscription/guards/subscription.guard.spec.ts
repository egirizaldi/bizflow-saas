import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionGuard } from './subscription.guard.js';

describe('SubscriptionGuard', () => {
  let guard: SubscriptionGuard;
  let reflector: Reflector;
  let prisma: any;

  beforeEach(() => {
    reflector = new Reflector();
    prisma = {
      subscription: {
        findUnique: vi.fn(),
      },
    };
    guard = new SubscriptionGuard(reflector, prisma);
  });

  const createMockContext = (tenantOrgId?: string, isSuperAdmin = false, headerOrgId?: string) => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          tenant: tenantOrgId ? { organizationId: tenantOrgId } : undefined,
          headers: headerOrgId ? { 'x-organization-id': headerOrgId } : {},
          user: { id: 'user-1', isSuperAdmin },
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no feature is required', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext('org-1');

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should bypass guard for Super Admin even if feature required', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('canViewAuditLogs');
    const context = createMockContext('org-1', true);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if organization ID is missing', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('canViewAuditLogs');
    const context = createMockContext(undefined, false, undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if subscription is not active or not found', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('canViewAuditLogs');
    prisma.subscription.findUnique.mockResolvedValue(null);
    const context = createMockContext('org-1');

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if current plan does not allow the feature', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('canExportReports');
    prisma.subscription.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      plan: {
        name: 'FREE',
        canExportReports: false,
        canViewAuditLogs: false,
      },
    });
    const context = createMockContext('org-1');

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access if plan has the required feature enabled', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('canExportReports');
    prisma.subscription.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      plan: {
        name: 'BUSINESS',
        canExportReports: true,
        canViewAuditLogs: true,
      },
    });
    const context = createMockContext('org-1');

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
