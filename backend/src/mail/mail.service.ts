import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private isMock = false;

  constructor(private configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<number>('SMTP_PORT')) || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    // Cek apakah kredensial valid atau placeholder/kosong
    const isPlaceholder =
      !host ||
      !user ||
      !pass ||
      user.includes('your-email') ||
      pass.includes('your-app-password');

    if (isPlaceholder) {
      this.isMock = true;
      this.logger.log(
        '📧 SMTP credentials placeholder/kosong. MailService berjalan dalam mode MOCK (Sandbox Log).',
      );
    } else {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        this.logger.log(`📧 SMTP Transporter terhubung ke ${host}:${port}`);
      } catch (err: any) {
        this.isMock = true;
        this.logger.warn(
          `Gagal menginisialisasi SMTP: ${err.message}. Beralih ke mode MOCK.`,
        );
      }
    }
  }

  async sendMail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string; isMock: boolean }> {
    const from =
      this.configService.get<string>('EMAIL_FROM') ||
      'noreply@bizflow-saas.com';

    if (this.isMock || !this.transporter) {
      const mockId = `mock-email-${Date.now()}`;
      this.logger.log(
        `[MOCK EMAIL SENT] ID: ${mockId} | To: ${options.to} | Subject: "${options.subject}"`,
      );
      return { success: true, messageId: mockId, isMock: true };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `BizFlow SaaS <${from}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || options.subject,
        html: options.html,
      });

      return { success: true, messageId: info.messageId, isMock: false };
    } catch (err: any) {
      this.logger.error(`Gagal mengirim email ke ${options.to}: ${err.message}`);
      return { success: false, isMock: false };
    }
  }

  async sendInvitationEmail(
    to: string,
    orgName: string,
    role: string,
    token: string,
    inviterName: string,
  ) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const acceptUrl = `${frontendUrl}/register?token=${token}`;

    const subject = `Undangan Bergabung ke Workspace "${orgName}" — BizFlow SaaS`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #4f46e5; color: #ffffff; padding: 32px 24px; text-align: center; }
          .content { padding: 32px 24px; line-height: 1.6; font-size: 14px; }
          .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 12px; margin: 20px 0; font-size: 14px; }
          .token-box { background: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #334155; margin: 16px 0; word-break: break-all; }
          .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0; font-size: 22px;">Undangan Anggota Tim</h2>
            <p style="margin: 6px 0 0; opacity: 0.9; font-size: 13px;">BizFlow Multi-Tenant SaaS Platform</p>
          </div>
          <div class="content">
            <p>Halo,</p>
            <p><strong>${inviterName}</strong> telah mengundang Anda untuk bergabung ke organisasi workspace <strong>${orgName}</strong> dengan peran sebagai <strong>${role}</strong>.</p>
            
            <div style="text-align: center;">
              <a href="${acceptUrl}" class="btn">Terima Undangan & Bergabung</a>
            </div>

            <p style="font-size: 12px; color: #64748b;">Atau salin tautan berikut ke peramban Anda jika tombol di atas tidak berfungsi:</p>
            <div class="token-box">${acceptUrl}</div>

            <p style="font-size: 12px; color: #64748b;">Kode Token Undangan Manual:</p>
            <div class="token-box" style="font-weight:bold; letter-spacing: 1px;">${token}</div>

            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">* Tautan dan token undangan ini berlaku selama 48 jam. Jika Anda tidak merasa diundang, abaikan pesan ini.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} BizFlow SaaS. Semua hak dilindungi undang-undang.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({ to, subject, html });
  }

  async sendPaymentReceiptEmail(
    to: string,
    orgName: string,
    planName: string,
    amount: number,
    invoiceNumber: string,
    orderId: string,
  ) {
    const subject = `Bukti Pembayaran Resmi [${invoiceNumber}] — BizFlow SaaS`;

    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: #0f172a; color: #ffffff; padding: 32px 24px; text-align: center; }
          .content { padding: 32px 24px; line-height: 1.6; font-size: 14px; }
          .badge-paid { background: #dcfce7; color: #15803d; font-weight: bold; padding: 4px 12px; border-radius: 9999px; font-size: 12px; display: inline-block; }
          .summary-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .summary-table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
          .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0; font-size: 22px;">Pembayaran Terverifikasi</h2>
            <p style="margin: 6px 0 0; opacity: 0.8; font-size: 13px;">Kuitansi Resmi Langganan BizFlow</p>
          </div>
          <div class="content">
            <div style="text-align: right; margin-bottom: 16px;">
              <span class="badge-paid">✓ LUNAS (PAID)</span>
            </div>

            <p>Terima kasih! Pembayaran langganan untuk workspace <strong>${orgName}</strong> telah berhasil diproses melalui Midtrans Gateway.</p>

            <table class="summary-table">
              <tr>
                <td style="color: #64748b;">No. Invoice</td>
                <td style="text-align: right; font-weight: bold; font-family: monospace;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Order ID</td>
                <td style="text-align: right; font-family: monospace;">${orderId}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Paket Berlangganan</td>
                <td style="text-align: right; font-weight: bold;">Paket ${planName} (1 Bulan)</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Tanggal Transaksi</td>
                <td style="text-align: right;">${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
              </tr>
              <tr style="border-bottom: 2px solid #e2e8f0;">
                <td style="font-weight: bold; font-size: 14px;">Total Dibayar</td>
                <td style="text-align: right; font-weight: bold; font-size: 16px; color: #4f46e5;">${formattedAmount}</td>
              </tr>
            </table>

            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Langganan Anda telah diperpanjang dan seluruh fitur paket ${planName} sudah dapat digunakan secara instan di dashboard workspace Anda.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} BizFlow SaaS. Semua hak dilindungi undang-undang.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({ to, subject, html });
  }

  async sendQuotaWarningEmail(
    to: string,
    orgName: string,
    planName: string,
    currentMembers: number,
    maxMembers: number,
  ) {
    const subject = `Peringatan: Batas Kuota Anggota Workspace "${orgName}" Hampir Penuh — BizFlow SaaS`;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; padding: 24px; color: #1e293b;">
        <div style="max-width: 540px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <h3 style="color: #ea580c; margin-top: 0;">⚠️ Peringatan Kuota Anggota</h3>
          <p>Workspace <strong>${orgName}</strong> telah menggunakan <strong>${currentMembers} dari ${maxMembers}</strong> slot anggota pada paket <strong>${planName}</strong>.</p>
          <p>Jika kuota penuh, penambahan anggota tim baru akan dibatasi. Tingkatkan paket Anda ke Business atau Enterprise untuk kapasitas yang lebih besar.</p>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({ to, subject, html });
  }
}
