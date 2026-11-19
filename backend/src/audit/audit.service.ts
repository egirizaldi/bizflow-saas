import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueryAuditLogDto } from './dto/query-audit-log.dto.js';
import { Prisma } from '@prisma/client';

export interface CreateAuditLogParams {
  organizationId: string;
  userId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  changesPayload?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async recordLog(data: CreateAuditLogParams) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          organizationId: data.organizationId,
          userId: data.userId || null,
          action: data.action,
          targetType: data.targetType || null,
          targetId: data.targetId || null,
          changesPayload: data.changesPayload || Prisma.JsonNull,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent ? data.userAgent.slice(0, 255) : null,
        },
      });
    } catch (err: any) {
      // Audit log gagal tidak boleh membatalkan proses bisnis utama
      this.logger.error(`Gagal mencatat audit log (${data.action}): ${err.message}`);
      return null;
    }
  }

  async getLogs(organizationId: string, query: QueryAuditLogDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
    };

    if (query.action && query.action !== 'ALL') {
      where.action = query.action;
    }

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { targetType: { contains: search, mode: 'insensitive' } },
        { targetId: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getDistinctActions(organizationId: string): Promise<string[]> {
    const actions = await this.prisma.auditLog.findMany({
      where: { organizationId },
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });

    return actions.map((a) => a.action);
  }
}
