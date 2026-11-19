import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service.js';
import { ConfigService } from '@nestjs/config';

describe('MailService (Transactional Email Notifications)', () => {
  let service: MailService;
  let configService: any;

  beforeEach(async () => {
    configService = {
      get: vi.fn((key: string) => {
        if (key === 'SMTP_HOST') return 'smtp.gmail.com';
        if (key === 'SMTP_PORT') return 587;
        if (key === 'SMTP_USER') return 'your-email@gmail.com'; // Mock placeholder
        if (key === 'SMTP_PASS') return 'your-app-password';
        if (key === 'EMAIL_FROM') return 'noreply@bizflow-saas.com';
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should initialize in MOCK mode when credentials are placeholders', () => {
    expect(service).toBeDefined();
  });

  describe('sendMail', () => {
    it('should send email in mock mode without throwing error', async () => {
      const result = await service.sendMail({
        to: 'test@example.com',
        subject: 'Tes Email',
        html: '<p>Halo</p>',
      });

      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
      expect(result.messageId).toContain('mock-email-');
    });
  });

  describe('sendInvitationEmail', () => {
    it('should generate valid invitation email and send successfully', async () => {
      const result = await service.sendInvitationEmail(
        'budi@example.com',
        'PT Maju Jaya',
        'MANAGER',
        'tok-123456',
        'Egi Rizaldi',
      );

      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
    });
  });

  describe('sendPaymentReceiptEmail', () => {
    it('should generate payment receipt email with invoice details', async () => {
      const result = await service.sendPaymentReceiptEmail(
        'finance@majujaya.com',
        'PT Maju Jaya',
        'BUSINESS',
        299000,
        'INV/20261119/BIZFLOW/001',
        'ORDER-BIZ-123',
      );

      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
    });
  });

  describe('sendQuotaWarningEmail', () => {
    it('should generate quota warning email', async () => {
      const result = await service.sendQuotaWarningEmail(
        'owner@majujaya.com',
        'PT Maju Jaya',
        'FREE',
        2,
        2,
      );

      expect(result.success).toBe(true);
    });
  });
});
