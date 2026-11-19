import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { Role, PaymentStatus, InvoiceStatus, SubscriptionStatus } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { MidtransWebhookDto } from './dto/midtrans-webhook.dto.js';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async createCheckout(
    organizationId: string,
    userId: string,
    userRole: string,
    planName: string,
  ) {
    if (userRole !== Role.OWNER) {
      throw new ForbiddenException(
        'Hanya pemilik (OWNER) organisasi yang berwenang melakukan checkout paket langganan.',
      );
    }

    const targetPlan = await this.prisma.plan.findUnique({
      where: { name: planName.toUpperCase() },
    });

    if (!targetPlan || !targetPlan.isActive) {
      throw new NotFoundException(
        `Paket langganan "${planName}" tidak ditemukan atau sedang tidak aktif.`,
      );
    }

    if (targetPlan.name === 'FREE') {
      throw new BadRequestException(
        'Paket FREE tidak memerlukan transaksi checkout pembayaran.',
      );
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: true,
      },
    });

    if (!organization || !organization.subscription) {
      throw new NotFoundException('Data organisasi atau langganan tidak ditemukan.');
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
        `Tidak dapat beralih ke paket ${targetPlan.name} karena organisasi saat ini memiliki ${activeMembersCount} anggota aktif (kuota maksimum paket ini hanya ${targetPlan.maxMembers} anggota).`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Generate Order ID Unik: BIZFLOW-<timestamp>-<randomHex>
    const orderId = `BIZFLOW-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const amount = Number(targetPlan.price);

    const isProduction = this.configService.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY') || '';
    const isMock = !serverKey || serverKey.includes('xxxxxxxxxxxx');

    let snapToken = '';
    let redirectUrl = '';

    if (!isMock) {
      const snapApiUrl = isProduction
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

      const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

      try {
        const response = await fetch(snapApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify({
            transaction_details: {
              order_id: orderId,
              gross_amount: amount,
            },
            customer_details: {
              first_name: user?.fullName || 'Pelanggan BizFlow',
              email: organization.billingEmail || user?.email || 'billing@bizflow.com',
            },
            item_details: [
              {
                id: targetPlan.id,
                price: amount,
                quantity: 1,
                name: `Paket ${targetPlan.name} (1 Bulan)`,
              },
            ],
          }),
        });

        const snapData = await response.json();
        if (snapData.token) {
          snapToken = snapData.token;
          redirectUrl = snapData.redirect_url;
        } else {
          this.logger.warn(
            `Midtrans API response: ${JSON.stringify(snapData)}. Falling back to Sandbox Mock Token.`,
          );
        }
      } catch (err: any) {
        this.logger.warn(`Gagal menghubungi Midtrans Snap API: ${err.message}. Menggunakan Sandbox Mock Token.`);
      }
    }

    // Jika mock atau fallback: buat token sandbox mock
    if (!snapToken) {
      snapToken = `SNAP-MOCK-${Date.now()}-${randomBytes(6).toString('hex')}`;
      redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`;
    }

    // Simpan entitas Payment berstatus PENDING
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        organizationId,
        subscriptionId: organization.subscription.id,
        amount: targetPlan.price,
        status: PaymentStatus.PENDING,
        snapToken,
        payloadResponse: {
          targetPlanId: targetPlan.id,
          targetPlanName: targetPlan.name,
          planPrice: amount,
          isMock,
        },
      },
    });

    return {
      success: true,
      orderId: payment.orderId,
      snapToken: payment.snapToken,
      redirectUrl,
      amount,
      plan: {
        id: targetPlan.id,
        name: targetPlan.name,
        price: amount,
        maxMembers: targetPlan.maxMembers,
      },
      clientKey: this.configService.get<string>('MIDTRANS_CLIENT_KEY') || 'SB-Mid-client-xxxxxxxxxxxx',
      isMock,
    };
  }

  async handleWebhook(payload: MidtransWebhookDto) {
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY') || '';
    const isMock = !serverKey || serverKey.includes('xxxxxxxxxxxx');

    // 1. Verifikasi Signature Hash SHA512 (Kecuali jika mock sandbox environment)
    if (!isMock) {
      const expectedSignature = createHash('sha512')
        .update(
          `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`,
        )
        .digest('hex');

      if (expectedSignature !== payload.signature_key) {
        this.logger.error(`Signature webhook mismatch untuk order ${payload.order_id}`);
        throw new UnauthorizedException('Signature webhook Midtrans tidak valid.');
      }
    }

    // 2. Ambil data payment
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: payload.order_id },
      include: {
        subscription: true,
        organization: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Order ID ${payload.order_id} tidak ditemukan.`);
    }

    // 3. Idempotency Check: Jika order sudah pernah sukses, abaikan pemrosesan ulang
    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        success: true,
        message: 'Order sudah berhasil diproses sebelumnya (Idempotent).',
        orderId: payment.orderId,
        status: PaymentStatus.SUCCESS,
      };
    }

    // 4. Evaluasi Status Transaksi Midtrans
    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;

    const isSuccess =
      transactionStatus === 'settlement' ||
      (transactionStatus === 'capture' && fraudStatus === 'accept');

    const isFailed = ['deny', 'cancel', 'expire'].includes(transactionStatus);

    if (isSuccess) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      const targetPlanId =
        (payment.payloadResponse as any)?.targetPlanId ||
        payment.subscription.planId;

      // Update transaksi Payment, Subscription, dan buat Invoice secara atomik
      const result = await this.prisma.$transaction(async (tx) => {
        // A. Update Payment menjadi SUCCESS
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            paidAt: now,
            paymentType: payload.payment_type || 'credit_card',
            payloadResponse: payload as any,
          },
        });

        // B. Perbarui Subscription organisasi ke target plan dan masa aktif 30 hari
        const updatedSubscription = await tx.subscription.update({
          where: { id: payment.subscriptionId },
          data: {
            planId: targetPlanId,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
          include: { plan: true },
        });

        // C. Generate Invoice resmi
        const invoiceNumber = `INV/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}/BIZFLOW/${payment.orderId.slice(-6)}`;

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            organizationId: payment.organizationId,
            paymentId: payment.id,
            amount: payment.amount,
            issueDate: now,
            dueDate: now,
            status: InvoiceStatus.PAID,
          },
        });

        // D. Catat Audit Log
        await tx.auditLog.create({
          data: {
            organizationId: payment.organizationId,
            action: 'PAYMENT_SUCCESS',
            targetType: 'Subscription',
            targetId: updatedSubscription.id,
            changesPayload: {
              orderId: payment.orderId,
              invoiceNumber: invoice.invoiceNumber,
              amount: Number(payment.amount),
              planName: updatedSubscription.plan.name,
            },
          },
        });

        return { updatedPayment, updatedSubscription, invoice };
      });

      // E. Kirim email bukti pembayaran resmi (non-blocking)
      try {
        const ownerUser = await this.prisma.user.findFirst({
          where: {
            memberships: {
              some: {
                organizationId: payment.organizationId,
                role: Role.OWNER,
              },
            },
          },
          select: { email: true },
        });

        const recipientEmail = payment.organization.billingEmail || ownerUser?.email;

        if (recipientEmail) {
          this.mailService
            .sendPaymentReceiptEmail(
              recipientEmail,
              payment.organization.name,
              result.updatedSubscription.plan.name,
              Number(payment.amount),
              result.invoice.invoiceNumber,
              payment.orderId,
            )
            .catch(() => {});
        }
      } catch {}

      return {
        success: true,
        message: 'Pembayaran berhasil diverifikasi dan langganan telah diperbarui!',
        orderId: result.updatedPayment.orderId,
        invoiceNumber: result.invoice.invoiceNumber,
        newPlan: result.updatedSubscription.plan.name,
        currentPeriodEnd: result.updatedSubscription.currentPeriodEnd,
      };
    } else if (isFailed) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status:
            transactionStatus === 'expire'
              ? PaymentStatus.EXPIRED
              : PaymentStatus.FAILED,
          payloadResponse: payload as any,
        },
      });

      return {
        success: false,
        message: `Pembayaran gagal atau kedaluwarsa (${transactionStatus}).`,
        orderId: payment.orderId,
        status: PaymentStatus.FAILED,
      };
    }

    return {
      success: true,
      message: 'Status transaksi dicatat.',
      orderId: payment.orderId,
      status: payment.status,
    };
  }

  async getBillingHistory(organizationId: string) {
    return this.prisma.payment.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: true,
      },
    });
  }

  async simulateSandboxPayment(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException(`Order ID ${orderId} tidak ditemukan.`);
    }

    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY') || '';
    const grossAmount = payment.amount.toString();
    const signatureKey = createHash('sha512')
      .update(`${orderId}200${grossAmount}${serverKey}`)
      .digest('hex');

    const payload: MidtransWebhookDto = {
      order_id: orderId,
      status_code: '200',
      gross_amount: grossAmount,
      signature_key: signatureKey,
      transaction_status: 'settlement',
      payment_type: 'qris_sandbox',
      settlement_time: new Date().toISOString(),
    };

    return this.handleWebhook(payload);
  }
}
