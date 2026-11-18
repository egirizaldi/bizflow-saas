import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Berhasil terhubung ke database PostgreSQL.');
    } catch (err: any) {
      this.logger.warn(
        '⚠️ PostgreSQL belum aktif di localhost:5432. Server tetap berjalan (pastikan menyalakan PostgreSQL untuk fitur registrasi/login database).',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
