import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TeamService } from './team.service.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator.js';

@Controller()
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  // 1. Kirim Undangan Anggota (Owner / Admin)
  @Post('organizations/:id/invitations')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async invite(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentTenant('role') currentUserRole: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.teamService.inviteMember(
      organizationId,
      currentUserId,
      currentUserRole,
      dto,
    );
  }

  // 2. Daftar Undangan Organisasi (Owner / Admin)
  @Get('organizations/:id/invitations')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async getInvitations(@CurrentTenant('id') organizationId: string) {
    return this.teamService.getInvitations(organizationId);
  }

  // 3. Terima Undangan (User Login yang diundang)
  @Post('invitations/accept')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async accept(
    @CurrentUser('id') currentUserId: string,
    @CurrentUser('email') currentUserEmail: string,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.teamService.acceptInvitation(
      currentUserId,
      currentUserEmail,
      dto.token,
    );
  }

  // 4. Daftar Seluruh Anggota Tim (Semua member dalam organisasi)
  @Get('organizations/:id/members')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getMembers(@CurrentTenant('id') organizationId: string) {
    return this.teamService.getMembers(organizationId);
  }

  // 5. Ubah Role Anggota Tim (Owner / Admin)
  @Patch('organizations/:id/members/:memberId')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async updateRole(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentTenant('role') currentUserRole: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.teamService.updateMemberRole(
      organizationId,
      currentUserId,
      currentUserRole,
      memberId,
      dto.role,
    );
  }

  // 6. Hapus / Kick Anggota Tim (Owner / Admin)
  @Delete('organizations/:id/members/:memberId')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  async removeMember(
    @CurrentTenant('id') organizationId: string,
    @CurrentUser('id') currentUserId: string,
    @CurrentTenant('role') currentUserRole: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamService.removeMember(
      organizationId,
      currentUserId,
      currentUserRole,
      memberId,
    );
  }
}
