import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service.js';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role, PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { createHash } from 'crypto';

describe('BillingService (Midtrans Payment Gateway & Webhook)', () => {
  let service: BillingService;
  let prisma: any;
  let configService: any;
  let mailService: any;
  const SERVER_KEY = 'SB-Mid-server-testkey';

  const calcSignature = (orderId: string, statusCode: string, grossAmount: string) => {
    return createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${SERVER_KEY}`)
      .digest('hex');
  };

  beforeEach(async () => {
    mailService = {
      sendInvitationEmail: vi.fn().mockResolvedValue({ success: true, isMock: true }),
      sendPaymentReceiptEmail: vi.fn().mockResolvedValue({ success: true, isMock: true }),
      sendQuotaWarningEmail: vi.fn().mockResolvedValue({ success: true, isMock: true }),
    };

    prisma = {
      plan: {
        findUnique: vi.fn(),
      },
      organization: {
        findUnique: vi.fn(),
      },
      organizationMember: {
        count: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({ email: 'owner@test.com' }),
      },
      payment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      subscription: {
        update: vi.fn(),
      },
      invoice: {
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prisma)),
    };

    configService = {
      get: vi.fn((key: string) => {
        if (key === 'MIDTRANS_SERVER_KEY') return SERVER_KEY;
        if (key === 'MIDTRANS_CLIENT_KEY') return 'SB-Mid-client-mock123';
        if (key === 'MIDTRANS_IS_PRODUCTION') return 'false';
        return null;
      }),
    };

    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({
        token: 'snap-token-midtrans-test',
        redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/mock',
      }),
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('createCheckout', () => {
    it('should throw ForbiddenException if user is not OWNER', async () => {
      await expect(
        service.createCheckout('org-1', 'user-1', Role.ADMIN, 'BUSINESS'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if plan does not exist', async () => {
      prisma.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckout('org-1', 'user-1', Role.OWNER, 'NON_EXISTENT'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if plan is FREE', async () => {
      prisma.plan.findUnique.mockResolvedValue({
        id: 'plan-free',
        name: 'FREE',
        price: 0,
        isActive: true,
      });

      await expect(
        service.createCheckout('org-1', 'user-1', Role.OWNER, 'FREE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if active members exceed target plan maxMembers', async () => {
      prisma.plan.findUnique.mockResolvedValue({
        id: 'plan-starter',
        name: 'STARTER',
        price: 99000,
        maxMembers: 5,
        isActive: true,
      });
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        subscription: { id: 'sub-1' },
      });
      // 8 members > 5 maxMembers
      prisma.organizationMember.count.mockResolvedValue(8);

      await expect(
        service.createCheckout('org-1', 'user-1', Role.OWNER, 'STARTER'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create checkout and return snapToken and orderId', async () => {
      const mockPlan = {
        id: 'plan-biz',
        name: 'BUSINESS',
        price: 299000,
        maxMembers: 20,
        isActive: true,
      };

      prisma.plan.findUnique.mockResolvedValue(mockPlan);
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        billingEmail: 'billing@test.com',
        subscription: { id: 'sub-1' },
      });
      prisma.organizationMember.count.mockResolvedValue(3);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        fullName: 'Egi Rizaldi',
        email: 'egi@test.com',
      });

      prisma.payment.create.mockImplementation((args: any) => ({
        id: 'pay-1',
        orderId: args.data.orderId,
        snapToken: args.data.snapToken,
        status: PaymentStatus.PENDING,
        amount: args.data.amount,
      }));

      const result = await service.createCheckout(
        'org-1',
        'user-1',
        Role.OWNER,
        'BUSINESS',
      );

      expect(result.success).toBe(true);
      expect(result.orderId).toContain('BIZFLOW-');
      expect(result.snapToken).toBeDefined();
      expect(result.amount).toBe(299000);
      expect(prisma.payment.create).toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    it('should throw UnauthorizedException if SHA512 signature is invalid', async () => {
      await expect(
        service.handleWebhook({
          order_id: 'ORDER-123',
          status_code: '200',
          gross_amount: '299000',
          signature_key: 'invalid-tampered-signature',
          transaction_status: 'settlement',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if orderId does not exist', async () => {
      const sig = calcSignature('NON_EXISTENT', '200', '299000');
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.handleWebhook({
          order_id: 'NON_EXISTENT',
          status_code: '200',
          gross_amount: '299000',
          signature_key: sig,
          transaction_status: 'settlement',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle idempotency gracefully if order is already SUCCESS', async () => {
      const sig = calcSignature('ORDER-123', '200', '299000');
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: 'ORDER-123',
        status: PaymentStatus.SUCCESS,
      });

      const result = await service.handleWebhook({
        order_id: 'ORDER-123',
        status_code: '200',
        gross_amount: '299000',
        signature_key: sig,
        transaction_status: 'settlement',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Idempotent');
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('should process settlement: mark payment SUCCESS, extend subscription, and create invoice', async () => {
      const sig = calcSignature('ORDER-123', '200', '299000');
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: 'ORDER-123',
        organizationId: 'org-1',
        subscriptionId: 'sub-1',
        amount: 299000,
        status: PaymentStatus.PENDING,
        payloadResponse: { targetPlanId: 'plan-biz' },
        subscription: { id: 'sub-1', planId: 'plan-free' },
        organization: { id: 'org-1' },
      });

      prisma.payment.update.mockResolvedValue({
        id: 'pay-1',
        orderId: 'ORDER-123',
        status: PaymentStatus.SUCCESS,
      });

      prisma.subscription.update.mockResolvedValue({
        id: 'sub-1',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date(),
        plan: { name: 'BUSINESS' },
      });

      prisma.invoice.create.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV/20261119/BIZFLOW/123456',
        amount: 299000,
      });

      const result = await service.handleWebhook({
        order_id: 'ORDER-123',
        status_code: '200',
        gross_amount: '299000',
        signature_key: sig,
        transaction_status: 'settlement',
        payment_type: 'bank_transfer',
      });

      expect(result.success).toBe(true);
      expect(result.newPlan).toBe('BUSINESS');
      expect(result.invoiceNumber).toBeDefined();
      expect(prisma.payment.update).toHaveBeenCalled();
      expect(prisma.subscription.update).toHaveBeenCalled();
      expect(prisma.invoice.create).toHaveBeenCalled();
    });

    it('should mark payment FAILED when transaction is cancelled or denied', async () => {
      const sig = calcSignature('ORDER-999', '202', '99000');
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        orderId: 'ORDER-999',
        status: PaymentStatus.PENDING,
        subscription: {},
        organization: {},
      });

      const result = await service.handleWebhook({
        order_id: 'ORDER-999',
        status_code: '202',
        gross_amount: '99000',
        signature_key: sig,
        transaction_status: 'cancel',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1' },
          data: expect.objectContaining({ status: PaymentStatus.FAILED }),
        }),
      );
    });
  });

  describe('simulateSandboxPayment', () => {
    it('should simulate a settlement webhook for an existing order', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-sim',
        orderId: 'ORDER-SIM',
        organizationId: 'org-1',
        subscriptionId: 'sub-1',
        amount: 99000,
        status: PaymentStatus.PENDING,
        payloadResponse: { targetPlanId: 'plan-starter' },
        subscription: { id: 'sub-1', planId: 'plan-free' },
        organization: { id: 'org-1' },
      });

      prisma.payment.update.mockResolvedValue({
        id: 'pay-sim',
        orderId: 'ORDER-SIM',
        status: PaymentStatus.SUCCESS,
      });

      prisma.subscription.update.mockResolvedValue({
        id: 'sub-1',
        status: SubscriptionStatus.ACTIVE,
        plan: { name: 'STARTER' },
      });

      prisma.invoice.create.mockResolvedValue({
        id: 'inv-sim',
        invoiceNumber: 'INV/SIM/001',
      });

      const result = await service.simulateSandboxPayment('ORDER-SIM');
      expect(result.success).toBe(true);
      expect(result.newPlan).toBe('STARTER');
    });
  });
});
