import { Role, MemberStatus } from '@prisma/client';

export interface TenantContext {
  id: string;
  role: Role;
  status: MemberStatus;
  name: string;
  slug: string;
}
