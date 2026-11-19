import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service.js';
import { AuditController } from './audit.controller.js';
import { SubscriptionModule } from '../subscription/subscription.module.js';

@Global()
@Module({
  imports: [SubscriptionModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
