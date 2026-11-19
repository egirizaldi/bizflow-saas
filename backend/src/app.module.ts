import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { OrganizationModule } from './organization/organization.module.js';
import { ProjectModule } from './project/project.module.js';
import { TeamModule } from './team/team.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { SubscriptionModule } from './subscription/subscription.module.js';
import { BillingModule } from './billing/billing.module.js';
import { AuditModule } from './audit/audit.module.js';
import { MailModule } from './mail/mail.module.js';
import { ReportModule } from './report/report.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    OrganizationModule,
    ProjectModule,
    TeamModule,
    AnalyticsModule,
    SubscriptionModule,
    BillingModule,
    AuditModule,
    ReportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
