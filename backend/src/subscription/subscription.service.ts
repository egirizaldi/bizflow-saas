import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Role } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getAllPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async getCurrentSubscription(organizationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: {
        plan: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Langganan organisasi tidak ditemukan.');
    }

    const activeMembersCount = await this.prisma.organizationMember.count({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
    });

    const pendingInvitesCount = await this.prisma.invitation.count({
      where: {
        organizationId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    const totalUsedSlots = activeMembersCount + pendingInvitesCount;
    const maxMembers = subscription.plan.maxMembers;
    const remainingSlots = Math.max(0, maxMembers - totalUsedSlots);
    const quotaPercentage = Math.min(
      100,
      Math.round((totalUsedSlots / maxMembers) * 100),
    );

    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const diffTime = periodEnd.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    return {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        daysRemaining,
      },
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        price: Number(subscription.plan.price),
        maxMembers: subscription.plan.maxMembers,
        canExportReports: subscription.plan.canExportReports,
        canViewAuditLogs: subscription.plan.canViewAuditLogs,
      },
      usage: {
        activeMembersCount,
        pendingInvitesCount,
        totalUsedSlots,
        maxMembers,
        remainingSlots,
        quotaPercentage,
        isLimitReached: totalUsedSlots >= maxMembers,
      },
      organization: subscription.organization,
    };
  }

  async switchPlan(
    organizationId: string,
    currentUserId: string,
    currentUserRole: string,
    planName: string,
  ) {
    if (currentUserRole !== Role.OWNER) {
      throw new ForbiddenException(
        'Hanya pemilik (OWNER) organisasi yang memiliki wewenang untuk mengubah atau meng-upgrade paket langganan.',
      );
    }

    const targetPlan = await this.prisma.plan.findUnique({
      where: { name: planName.toUpperCase() },
    });

    if (!targetPlan || !targetPlan.isActive) {
      throw new NotFoundException(
        `Paket langganan "${planName}" tidak ditemukan atau sudah tidak aktif.`,
      );
    }

    const currentSubscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (!currentSubscription) {
      throw new NotFoundException('Langganan organisasi tidak ditemukan.');
    }

    // Validasi pembatasan downgrade jika kuota anggota melebihi batas paket tujuan
    const activeMembersCount = await this.prisma.organizationMember.count({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (activeMembersCount > targetPlan.maxMembers) {
      throw new BadRequestException(
        `Tidak dapat beralih ke paket ${targetPlan.name} karena organisasi saat ini memiliki ${activeMembersCount} anggota aktif (kuota maksimum paket ini hanya ${targetPlan.maxMembers} anggota). Silakan kurangi anggota terlebih dahulu.`,
      );
    }

    // Set masa aktif 30 hari ke depan
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const updated = await this.prisma.subscription.update({
      where: { organizationId },
      data: {
        planId: targetPlan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });

    // Catat log audit peralihan paket
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          userId: currentUserId,
          action: 'PLAN_SWITCHED',
          entity: 'Subscription',
          entityId: updated.id,
          details: {
            previousPlan: currentSubscription.plan.name,
            newPlan: targetPlan.name,
            price: Number(targetPlan.price),
          },
        },
      });
    } catch {
      // Audit log non-blocking
    }

    return {
      message: `Paket langganan berhasil dialihkan ke ${targetPlan.name}.`,
      subscription: {
        id: updated.id,
        status: updated.status,
        currentPeriodStart: updated.currentPeriodStart,
        currentPeriodEnd: updated.currentPeriodEnd,
        plan: {
          id: targetPlan.id,
          name: targetPlan.name,
          price: Number(targetPlan.price),
          maxMembers: targetPlan.maxMembers,
          canExportReports: targetPlan.canExportReports,
          canViewAuditLogs: targetPlan.canViewAuditLogs,
        },
      },
    };
  }
}
