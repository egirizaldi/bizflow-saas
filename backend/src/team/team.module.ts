import { Module } from '@nestjs/common';
import { TeamService } from './team.service.js';
import { TeamController } from './team.controller.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  controllers: [TeamController],
  providers: [TeamService, TenantGuard, RolesGuard],
  exports: [TeamService],
})
export class TeamModule {}
