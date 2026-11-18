import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrganizationService } from './organization.service.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.orgService.create(userId, dto);
  }

  @Get('my')
  async getMyOrganizations(@CurrentUser('id') userId: string) {
    return this.orgService.getUserOrganizations(userId);
  }

  @Get(':id')
  async getOrganizationById(
    @CurrentUser('id') userId: string,
    @Param('id') orgId: string,
  ) {
    return this.orgService.getOrganizationById(userId, orgId);
  }

  @Patch(':id')
  async updateOrganization(
    @CurrentUser('id') userId: string,
    @Param('id') orgId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgService.update(userId, orgId, dto);
  }
}
