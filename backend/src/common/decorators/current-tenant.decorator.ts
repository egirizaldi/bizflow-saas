import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../interfaces/tenant-context.interface.js';

export const CurrentTenant = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant: TenantContext = request.tenant;
    return data ? tenant?.[data] : tenant;
  },
);
