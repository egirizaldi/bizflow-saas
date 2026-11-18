import { Test, TestingModule } from '@nestjs/testing';
import { TenantGuard } from './tenant.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      organizationMember: {
        findUnique: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
  });

  const createMockContext = (headers: Record<string, string>, user: any = { id: 'user-1' }) => {
    const request: any = {
      headers,
      user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('should throw ForbiddenException if user is not authenticated', async () => {
    const context = createMockContext({}, null);
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if x-organization-id header is missing', async () => {
    const context = createMockContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
  });

  it('should throw ForbiddenException if user is not a member of requested organization (Cross-Tenant Breach Attempt)', async () => {
    const context = createMockContext({ 'x-organization-id': 'org-target-secret' });
    prisma.organizationMember.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user membership is SUSPENDED', async () => {
    const context = createMockContext({ 'x-organization-id': 'org-1' });
    prisma.organizationMember.findUnique.mockResolvedValue({
      status: 'SUSPENDED',
      organization: { isActive: true },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow request and inject request.tenant if user is an ACTIVE member', async () => {
    const context = createMockContext({ 'x-organization-id': 'org-1' });
    prisma.organizationMember.findUnique.mockResolvedValue({
      organizationId: 'org-1',
      role: 'ADMIN',
      status: 'ACTIVE',
      organization: {
        id: 'org-1',
        name: 'PT Maju Jaya',
        slug: 'pt-maju-jaya',
        isActive: true,
      },
    });

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);

    const req = context.switchToHttp().getRequest();
    expect(req.tenant).toBeDefined();
    expect(req.tenant.id).toBe('org-1');
    expect(req.tenant.role).toBe('ADMIN');
    expect(req.tenant.name).toBe('PT Maju Jaya');
  });
});
