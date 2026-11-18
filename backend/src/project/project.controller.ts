import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ProjectService } from './project.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';

@Controller('projects')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.MANAGER) // Hanya Owner, Admin, Manager yang bisa membuat project
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectService.create(organizationId, userId, dto);
  }

  @Get()
  // Semua role (termasuk STAFF) boleh melihat daftar project organisasi
  async findAll(@CurrentTenant('id') organizationId: string) {
    return this.projectService.findAll(organizationId);
  }

  @Get(':id')
  async findOne(
    @CurrentTenant('id') organizationId: string,
    @Param('id') projectId: string,
  ) {
    return this.projectService.findOne(organizationId, projectId);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN) // Hanya Owner dan Admin yang boleh menghapus project
  async delete(
    @CurrentTenant('id') organizationId: string,
    @Param('id') projectId: string,
  ) {
    return this.projectService.delete(organizationId, projectId);
  }
}
