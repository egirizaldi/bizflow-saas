import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Role } from '@prisma/client';
import { CheckoutDto } from './dto/checkout.dto.js';
import { MidtransWebhookDto } from './dto/midtrans-webhook.dto.js';

@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(Role.OWNER)
  @Post('checkout')
  async checkout(@Request() req: any, @Body() dto: CheckoutDto) {
    return this.billingService.createCheckout(
      req.tenant.organizationId,
      req.user.id,
      req.tenant.role,
      dto.planName,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  async midtransWebhook(@Body() payload: MidtransWebhookDto) {
    return this.billingService.handleWebhook(payload);
  }

  @UseGuards(JwtAuthGuard, TenantGuard)
  @Get('history')
  async getBillingHistory(@Request() req: any) {
    return this.billingService.getBillingHistory(req.tenant.organizationId);
  }

  // Endpoint sandbox simulation: Mensimulasikan sukses bayar secara langsung
  @UseGuards(JwtAuthGuard, TenantGuard)
  @Post('simulate-pay/:orderId')
  async simulatePay(@Param('orderId') orderId: string) {
    return this.billingService.simulateSandboxPayment(orderId);
  }
}
