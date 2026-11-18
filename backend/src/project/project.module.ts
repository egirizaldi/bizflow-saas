import { Module } from '@nestjs/common';
import { ProjectService } from './project.service.js';
import { ProjectController } from './project.controller.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, TenantGuard, RolesGuard],
  exports: [ProjectService],
})
export class ProjectModule {}
