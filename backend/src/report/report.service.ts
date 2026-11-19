import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Export daftar proyek tenant ke format Excel (.xlsx)
   */
  async exportProjectsExcel(organizationId: string): Promise<{ buffer: Buffer; filename: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, slug: true },
    });

    const projects = await this.prisma.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BizFlow SaaS';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Daftar Proyek');

    // Title Header
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `LAPORAN DAFTAR PROYEK — ${org?.name || 'ORGANISASI'}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }, // Indigo-600
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 36;

    // Subtitle / Info
    worksheet.mergeCells('A2:E2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `Diekspor pada: ${new Date().toLocaleString('id-ID')} | Total: ${projects.length} Proyek`;
    subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(2).height = 22;

    // Table Column Headers
    const headers = [
      { header: 'No', key: 'no', width: 8 },
      { header: 'Nama Proyek', key: 'name', width: 35 },
      { header: 'Deskripsi', key: 'description', width: 45 },
      { header: 'Tanggal Dibuat', key: 'createdAt', width: 22 },
      { header: 'Terakhir Diperbarui', key: 'updatedAt', width: 22 },
    ];

    const headerRow = worksheet.getRow(4);
    headers.forEach((h, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = h.header;
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }, // Slate-800
      };
      cell.alignment = { vertical: 'middle', horizontal: index === 0 ? 'center' : 'left' };
      worksheet.getColumn(index + 1).width = h.width;
    });
    headerRow.height = 26;

    // Data Rows
    projects.forEach((proj, idx) => {
      const row = worksheet.addRow({
        no: idx + 1,
        name: proj.name,
        description: proj.description || '-',
        createdAt: proj.createdAt.toLocaleString('id-ID'),
        updatedAt: proj.updatedAt.toLocaleString('id-ID'),
      });

      row.height = 22;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `projects-${org?.slug || 'workspace'}-${timestamp}.xlsx`;

    return { buffer, filename };
  }

  /**
   * Export histori Audit Log tenant ke format Excel (.xlsx)
   */
  async exportAuditLogsExcel(organizationId: string): Promise<{ buffer: Buffer; filename: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, slug: true },
    });

    const logs = await this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 500, // batasi 500 riwayat terbaru untuk efisiensi
      include: {
        user: { select: { fullName: true, email: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BizFlow SaaS';
    const worksheet = workbook.addWorksheet('Audit Trail');

    // Title
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `AUDIT TRAIL & LOG AKTIVITAS — ${org?.name || 'ORGANISASI'}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 36;

    const headers = [
      { header: 'No', width: 8 },
      { header: 'Waktu (WIB)', width: 22 },
      { header: 'Aksi (Action)', width: 22 },
      { header: 'Aktor (User)', width: 30 },
      { header: 'Target Entitas', width: 20 },
      { header: 'Detail Perubahan', width: 50 },
    ];

    const headerRow = worksheet.getRow(3);
    headers.forEach((h, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = h.header;
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF334155' },
      };
      cell.alignment = { vertical: 'middle', horizontal: index === 0 ? 'center' : 'left' };
      worksheet.getColumn(index + 1).width = h.width;
    });
    headerRow.height = 25;

    logs.forEach((log, idx) => {
      const actor = log.user ? `${log.user.fullName} (${log.user.email})` : 'System / Webhook';
      const payloadStr = log.changesPayload ? JSON.stringify(log.changesPayload) : '-';

      const row = worksheet.addRow([
        idx + 1,
        log.createdAt.toLocaleString('id-ID'),
        log.action,
        actor,
        `${log.targetType || '-'}${log.targetId ? ` #${log.targetId.slice(0, 8)}` : ''}`,
        payloadStr,
      ]);

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (colNumber === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `audit-trail-${org?.slug || 'workspace'}-${timestamp}.xlsx`;

    return { buffer, filename };
  }

  /**
   * Generate Faktur / Invoice PDF Resmi per pembayaran
   */
  async generateInvoicePdf(
    organizationId: string,
    invoiceId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId,
      },
      include: {
        organization: true,
        payment: {
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice dengan ID ${invoiceId} tidak ditemukan.`);
    }

    const planName = invoice.payment?.subscription?.plan?.name || 'Paket Langganan';
    const amountFormatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(invoice.amount));

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 45, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const filename = `Invoice-${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`;
        resolve({ buffer, filename });
      });
      doc.on('error', (err) => reject(err));

      // 1. Header Banner
      doc.rect(45, 45, 505, 75).fill('#0f172a');

      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold');
      doc.text('BIZFLOW SAAS', 65, 62);

      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica');
      doc.text('Platform Manajemen Kolaborasi Multi-Tenant', 65, 90);

      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold');
      doc.text('FAKTUR / INVOICE', 380, 62, { align: 'right' });

      doc.fillColor('#38bdf8').fontSize(10).font('Helvetica-Bold');
      doc.text(invoice.invoiceNumber, 380, 85, { align: 'right' });

      // 2. Info Transaksi & Penerima
      const startY = 145;
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold');
      doc.text('DITERBITKAN UNTUK:', 45, startY);

      doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a');
      doc.text(invoice.organization.name, 45, startY + 16);

      doc.font('Helvetica').fontSize(9).fillColor('#64748b');
      doc.text(`Email Penagihan: ${invoice.organization.billingEmail || 'Tidak disetel'}`, 45, startY + 32);
      doc.text(`Tenant Slug: ${invoice.organization.slug}`, 45, startY + 46);

      // Kolom kanan: Tanggal & Status
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold');
      doc.text('RINCIAN PEMBAYARAN:', 360, startY);

      doc.font('Helvetica').fontSize(9).fillColor('#64748b');
      doc.text(`Tanggal Terbit: ${invoice.issueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 360, startY + 16);
      doc.text(`Metode: ${invoice.payment?.paymentType || 'Midtrans Gateway'}`, 360, startY + 30);
      doc.text(`Order ID: ${invoice.payment?.orderId || '-'}`, 360, startY + 44);

      // Status Badge (PAID / LUNAS)
      doc.roundedRect(360, startY + 62, 110, 22, 4).fill('#dcfce7');
      doc.fillColor('#15803d').fontSize(10).font('Helvetica-Bold');
      doc.text('✓ STATUS: LUNAS', 372, startY + 68);

      // 3. Tabel Rincian Pembelian
      const tableY = 250;
      doc.rect(45, tableY, 505, 26).fill('#f1f5f9');
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold');
      doc.text('ITEM DESKRIPSI', 55, tableY + 8);
      doc.text('DURASI', 300, tableY + 8);
      doc.text('JUMLAH', 440, tableY + 8, { align: 'right' });

      // Table row
      const itemRowY = tableY + 36;
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
      doc.text(`Langganan Paket ${planName}`, 55, itemRowY);
      doc.fillColor('#64748b').fontSize(9).font('Helvetica');
      doc.text('Akses fitur workspace premium, kuota anggota, dan analitik lengkap', 55, itemRowY + 14);

      doc.fillColor('#334155').fontSize(10).font('Helvetica');
      doc.text('1 Bulan (30 Hari)', 300, itemRowY + 6);

      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold');
      doc.text(amountFormatted, 440, itemRowY + 6, { align: 'right' });

      // Garis pemisah
      doc.moveTo(45, itemRowY + 40).lineTo(550, itemRowY + 40).strokeColor('#e2e8f0').stroke();

      // Total Box
      const totalY = itemRowY + 55;
      doc.rect(320, totalY, 230, 48).fill('#f8fafc');
      doc.rect(320, totalY, 230, 48).strokeColor('#cbd5e1').stroke();

      doc.fillColor('#64748b').fontSize(10).font('Helvetica');
      doc.text('TOTAL PEMBAYARAN:', 335, totalY + 18);

      doc.fillColor('#4f46e5').fontSize(13).font('Helvetica-Bold');
      doc.text(amountFormatted, 430, totalY + 17, { align: 'right' });

      // 4. Catatan & Syarat
      const notesY = 430;
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold');
      doc.text('CATATAN PENTING:', 45, notesY);

      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica');
      doc.text(
        '1. Faktur ini sah dan diterbitkan secara digital oleh sistem BizFlow SaaS terintegrasi Midtrans Payment Gateway.\n' +
        '2. Layanan langganan Anda aktif otomatis selama 30 hari ke depan terhitung sejak tanggal faktur ini diterbitkan.\n' +
        '3. Simpan faktur ini sebagai bukti pembayaran pajak dan pembukuan resmi organisasi Anda.',
        45,
        notesY + 16,
        { lineGap: 4, width: 505 },
      );

      // 5. Footer & Cap Digital
      doc.rect(45, 715, 505, 1).fill('#e2e8f0');
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica');
      doc.text(
        'BizFlow SaaS Corporation — Enterprise Cloud Management System — https://bizflow.internal',
        45,
        728,
        { align: 'center', width: 505 },
      );

      doc.end();
    });
  }
}
