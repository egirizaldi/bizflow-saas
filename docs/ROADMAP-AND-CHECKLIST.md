# Roadmap & Checklist Implementasi 12 Tahap
## Panduan Eksekusi Bertahap Proyek BizFlow SaaS

Dokumen ini memecah pembangunan proyek BizFlow ke dalam **12 tahap terstruktur**. Setiap tahap dilengkapi dengan checklist teknis dan *Acceptance Criteria* yang jelas agar progres terukur dan tidak ada fitur yang terlewat.

---

## 1. Ikhtisar Tahapan Eksekusi

| Tahap | Modul / Fitur | Tingkat Kompleksitas | Prioritas |
|:---:|---|:---:|:---:|
| **1** | Authentication & Session Management | Sedang | 🔴 Wajib |
| **2** | Organization & Workspace Management | Sedang | 🔴 Wajib |
| **3** | Multi-Tenant Architecture & Data Scoping | Tinggi | 🔴 Wajib |
| **4** | Role-Based Access Control (RBAC) | Sedang | 🔴 Wajib |
| **5** | Team Management & Invitations | Sedang | 🔴 Wajib |
| **6** | Dashboard Analytics & Metrik | Rendah - Sedang | 🔴 Wajib |
| **7** | Subscription Management & Plan Gating | Sedang | 🟡 Menengah |
| **8** | Payment Gateway Integration (Midtrans) | Tinggi | 🟡 Menengah |
| **9** | Audit Logging System | Sedang | 🟡 Menengah |
| **10** | Transactional Email Notifications | Rendah - Sedang | 🟢 Tambahan |
| **11** | Export Laporan (PDF & Excel) | Sedang | 🟢 Tambahan |
| **12** | Containerization & VPS Deployment | Tinggi | 🔴 Wajib |

---

## 2. Rincian Checklist & Kriteria Selesai Per Tahap

---

### Tahap 1: Authentication & Session Management
> **Fokus**: Registrasi user, login aman, rotasi token JWT, dan proteksi rute dasar.
> **Status**: ✅ COMPLETED (Backend API + 8 Tests + Next.js App Router Frontend)

#### Checklist Pengerjaan:
- [x] Inisialisasi project NestJS (`backend`) dan Prisma dengan schema `User` serta seluruh skema SaaS multi-tenant.
- [x] Implementasi hashing password dengan `bcrypt` (salt rounds 12).
- [x] Modul Auth: endpoint `POST /api/v1/auth/register` dan `POST /api/v1/auth/login`.
- [x] Implementasi JWT Strategy (`Passport.js`) untuk menghasilkan `accessToken` (15 menit) dan `refreshToken` (7 hari).
- [x] Endpoint `POST /api/v1/auth/refresh` dan `GET /api/v1/auth/me` terproteksi `JwtAuthGuard`.
- [x] Unit test komprehensif (`src/auth/auth.service.spec.ts`) - 8/8 tests passed.
- [x] Setup Next.js (`frontend`) dengan Landing Page modern, Pricing table, form Register dan form Login terhubung ke API.
- [x] Next.js middleware / proxy protection (`src/middleware.ts`) untuk redirect otomatis pengguna unauthenticated dari `/dashboard`.
- [x] Workspace & token state management di frontend (`src/lib/api.ts` & `src/lib/auth.ts`).

#### Acceptance Criteria:
- Pengguna baru berhasil mendaftar dan login.
- Request dengan token kedaluwarsa otomatis diperbarui melalui refresh token tanpa memaksa logout pengguna.
- Password tersimpan dalam bentuk hash yang aman di PostgreSQL.

---

### Tahap 2: Organization & Workspace Management
> **Fokus**: Pembuatan organisasi, relasi user ke organisasi, dan pemilihan workspace aktif.
> **Status**: ✅ COMPLETED (API + 7 Tests + Workspace Switcher & Modal UI)

#### Checklist Pengerjaan:
- [x] Migrasi database dan modul `Organization` di NestJS (`src/organization`).
- [x] Endpoint `POST /api/v1/organizations`: Membuat organisasi baru, auto-slugify unik, mendaftarkan pembuat sebagai `OWNER` secara atomik (`$transaction`), dan bind default Free Tier.
- [x] Endpoint `GET /api/v1/organizations/my`: Mengambil daftar seluruh organisasi yang diikuti oleh akun saat ini beserta role dan total anggotanya.
- [x] Endpoint `GET /api/v1/organizations/:id` & `PATCH /api/v1/organizations/:id` (proteksi hak akses role Owner/Admin).
- [x] Unit test komprehensif (`src/organization/organization.service.spec.ts`) - 7/7 tests passed (total 15/15 tests di backend).
- [x] Frontend: Komponen **Dynamic Workspace Switcher** di header navbar dashboard.
- [x] Frontend: Modal interaktif **"Tambah Organisasi Baru"** lengkap dengan auto-slug generator dan feedback state.
- [x] Sinkronisasi `currentOrgId` di Cookies & localStorage dengan auto-reload switcher.

#### Acceptance Criteria:
- Pengguna dapat membuat organisasi baru setelah mendaftar.
- Satu pengguna dapat memiliki lebih dari satu organisasi dan dapat berganti workspace dengan lancar di UI.

---

### Tahap 3: Multi-Tenant Architecture & Data Scoping
> **Fokus**: Isolasi data ketat agar Tenant A tidak pernah bisa melihat atau memanipulasi data Tenant B.
> **Status**: ✅ COMPLETED (TenantGuard + CurrentTenant Decorator + Project Scoping + 24 Tests)

#### Checklist Pengerjaan:
- [x] Buat `TenantGuard` di NestJS: Memvalidasi header `x-organization-id`, memverifikasi user adalah anggota aktif organisasi, dan menghentikan percobaan akses lintas tenant (IDOR).
- [x] Buat parameter decorator `@CurrentTenant()` dan `@CurrentUser()`.
- [x] Schema `Project` terisolasi dengan relasi `organizationId` di Prisma Schema.
- [x] Implementasi resource `ProjectService` & `ProjectController` dengan strict tenant scoping: seluruh query wajib menyertakan filter `WHERE organizationId = currentTenantId`.
- [x] Unit test komprehensif (`src/common/guards/tenant.guard.spec.ts` & `src/project/project.service.spec.ts`) - 24/24 tests passed di backend.
- [x] Frontend: Injeksi header `x-organization-id` pada seluruh request API tenant via `apiRequest`.
- [x] Frontend: Komponen manajemen Project di Dashboard yang datanya otomatis berganti dan terisolasi sesuai workspace aktif.

#### Acceptance Criteria:
- Request API tanpa header `x-organization-id` mengembalikan error `400 Bad Request`.
- Request API dengan `x-organization-id` milik organisasi lain yang tidak diikuti user mengembalikan `403 Forbidden`.
- Data yang tampil di frontend 100% hanya milik organisasi yang sedang aktif dipilih.

---

### Tahap 4: Role-Based Access Control (RBAC)
> **Fokus**: Pembatasan wewenang antar anggota di dalam organisasi yang sama (Owner, Admin, Manager, Staff).
> **Status**: ✅ COMPLETED (RolesGuard + @Roles Decorator + Declarative <Can> UI + 30 Tests)

#### Checklist Pengerjaan:
- [x] Definisikan enum role: `OWNER`, `ADMIN`, `MANAGER`, `STAFF` dengan matriks hak akses terstruktur.
- [x] Buat custom decorator `@Roles(...)` di NestJS.
- [x] Buat `RolesGuard` yang membaca role user dari konteks tenant (`request.tenant.role`) dan mengizinkan bypass khusus Platform Super Admin.
- [x] Terapkan guard pada endpoint:
  - `POST /projects`: Dibatasi untuk `OWNER`, `ADMIN`, `MANAGER` (Staff diblokir).
  - `DELETE /projects/:id`: Dibatasi khusus untuk `OWNER` dan `ADMIN`.
- [x] Unit test komprehensif (`src/common/guards/roles.guard.spec.ts`) - 30/30 tests passed di backend.
- [x] Frontend: Helper komponen deklaratif `<Can currentRole={...} roles={['OWNER', 'ADMIN']}>` di `src/components/can.tsx`.
- [x] Frontend: Modal interaktif **"Matriks Hak Akses RBAC"** di dashboard untuk transparansi izin antar role.

#### Acceptance Criteria:
- Pengguna dengan role `STAFF` ditolak saat memanggil API manipulasi tim atau pengaturan perusahaan.
- UI secara cerdas menyembunyikan navigasi dan tombol yang tidak diizinkan untuk role terkait.

---

### Tahap 5: Team Management & Invitations
> **Fokus**: Mengundang rekan kerja via email, mengelola role, dan menghapus anggota.
> **Status**: ✅ COMPLETED (TeamService + Invitations + Role Changer & Member Removal + 47 Tests)

#### Checklist Pengerjaan:
- [x] Migrasi tabel `Invitation` dan relasi ke `OrganizationMember`.
- [x] Endpoint `POST /api/v1/organizations/:id/invitations`: Membuat token undangan acak dengan expiry 48 jam (dibatasi khusus Owner/Admin).
- [x] Endpoint `GET /api/v1/organizations/:id/invitations`: Daftar undangan aktif yang menunggu konfirmasi.
- [x] Endpoint `POST /api/v1/invitations/accept`: Verifikasi token undangan dan masa aktif, otomatis menghubungkan user ke organisasi sebagai `OrganizationMember`.
- [x] Endpoint `GET /api/v1/organizations/:id/members`: Menampilkan daftar anggota, role (Owner berurutan di atas), dan tanggal bergabung.
- [x] Endpoint `PATCH /api/v1/organizations/:id/members/:memberId`: Ubah role (Admin tidak boleh ubah Owner atau sesama Admin).
- [x] Endpoint `DELETE /api/v1/organizations/:id/members/:memberId`: Kick member (Owner tidak bisa dikeluarkan, user tidak bisa kick diri sendiri).
- [x] Unit test komprehensif (`src/team/team.service.spec.ts`) - 47/47 tests passed di backend.
- [x] Frontend: Tab **"Anggota Tim"** di dashboard dengan tabel daftar anggota, tombol undang anggota, role switcher, dan salin token undangan.

#### Acceptance Criteria:
- Pemilik organisasi dapat mengundang email anggota baru.
- Calon anggota dapat mengklik link di email untuk langsung masuk ke organisasi.
- Owner tidak dapat mengeluarkan dirinya sendiri (mencegah organisasi tanpa owner).

---

### Tahap 6: Dashboard Analytics & Metrik
> **Fokus**: Ringkasan data operasional dan visualisasi statistik untuk pengguna dan super admin.
> **Status**: ✅ COMPLETED (AnalyticsService + Recharts Visualizations + Quota & RBAC Breakdown + Super Admin Macro Stats)

#### Checklist Pengerjaan:
- [x] Endpoint `GET /api/v1/dashboard/metrics`: Mengembalikan total anggota, kuota penggunaan, distribusi RBAC, status langganan, dan aktivitas bulanan tenant.
- [x] Endpoint `GET /api/v1/admin/analytics`: Endpoint Super Admin macro analytics untuk memonitor total organisasi, pengguna global, langganan aktif, dan estimasi MRR.
- [x] Frontend: Halaman Dashboard interaktif dengan kartu ringkasan (*Total Team Members*, *Current Plan*, *Account Status*, *Quota Meter*).
- [x] Chart visualisasi (Recharts): Bar Chart untuk tren aktivitas bulanan (Projects & Members) dan Donut/Pie Chart untuk komposisi RBAC tim.
- [x] Unit test komprehensif (`src/analytics/analytics.service.spec.ts`) - 50/50 tests passed di backend.
- [x] Super Admin Dashboard: Metric cards khusus Super Admin untuk melihat ringkasan seluruh tenant secara makro.

#### Acceptance Criteria:
- Data statistik tampil real-time dan terisolasi per organisasi.
- Super Admin dapat melihat ringkasan seluruh tenant secara makro.

---

### Tahap 7: Subscription Management & Plan Gating
> **Fokus**: Struktur paket (Free, Starter, Business, Enterprise) dan pembatasan fitur berdasarkan tier.
> **Status**: ✅ COMPLETED (SubscriptionModule + SubscriptionGuard + Quota Enforcement in TeamService + Live Tester UI & Pricing Table + 64 Tests)

#### Checklist Pengerjaan:
- [x] Migrasi tabel `Plan` dan `Subscription` (Relasi cascade & restrict schema).
- [x] Seed data awal paket: Free (Rp0), Starter (Rp99k), Business (Rp299k), Enterprise (Rp999k).
- [x] Buat `SubscriptionGuard` dan decorator `@RequireFeature()` di NestJS untuk membatasi endpoint tertentu (misal: fitur audit logs & export laporan hanya untuk Business+).
- [x] Validasi batas kuota: Mencegah penambahan/undangan member baru jika jumlah member telah mencapai `maxMembers` paket aktif (`ForbiddenException`).
- [x] Validasi downgrade paket: Mencegah downgrade jika jumlah anggota aktif melebihi batas paket tujuan (`BadRequestException`).
- [x] Unit test komprehensif (`subscription.service.spec.ts` & `subscription.guard.spec.ts`) - 64/64 tests passed di backend.
- [x] Frontend: Tab **"Langganan & Paket"** dengan Current Plan Badge, Kuota Anggota Meter, Live SubscriptionGuard Tester, Pricing Cards interaktif, dan Tabel Komparasi Fitur.
- [x] Frontend: Indikator kuota anggota dan peringatan limit kuota pada tab Anggota Tim & Dialog Undangan.

#### Acceptance Criteria:
- Tenant pada Free Tier otomatis diblokir saat mencoba menambahkan member melebihi limit kuota paket.
- UI menampilkan badge paket langganan aktif saat ini dan tombol interaktif peralihan paket.

---

### Tahap 8: Payment Gateway Integration (Midtrans)
> **Fokus**: Alur checkout berbayar, integrasi Midtrans Snap, dan webhook reconciliation.
> **Status**: ✅ COMPLETED (BillingService + Midtrans Snap Checkout + SHA512 Webhook + Idempotent Invoicing + Interactive Sandbox Modal + 75 Tests)

#### Checklist Pengerjaan:
- [x] Konfigurasi kredensial Midtrans Sandbox (`MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`).
- [x] Endpoint `POST /api/v1/billing/checkout`: Memanggil Midtrans Snap API (atau Sandbox Fallback) menghasilkan `snapToken`, `orderId`, dan record transaksi `Payment` status `PENDING`.
- [x] Frontend: Memasang script Midtrans Snap JS dan modal dialog interaktif pembayaran saat checkout diklik.
- [x] Endpoint `POST /api/v1/billing/webhook`: Handler notifikasi Midtrans dengan parsing status `settlement`, `capture`, `deny`, `cancel`, `expire`.
- [x] Verifikasi signature hash SHA512 pada webhook payload (`crypto.createHash('sha512')`).
- [x] Idempotency handling: Memastikan order yang sudah lunas tidak diproses ulang (`PaymentStatus.SUCCESS` bypass).
- [x] Update atomik: Update subscription (`planId`, `status: ACTIVE`, `currentPeriodEnd = now + 30 days`) dan generate invoice resmi otomatis (`Invoice` table).
- [x] Unit test komprehensif (`src/billing/billing.service.spec.ts`) - 75/75 tests passed di backend.
- [x] Frontend: Tabel Riwayat Transaksi & Tagihan (Invoices) dengan modal bukti invoice resmi digital.

#### Acceptance Criteria:
- Simulasi pembayaran via Midtrans Snap (QRIS, VA, Kartu Kredit) berhasil.
- Subscription tenant otomatis ter-upgrade ke status aktif segera setelah webhook diterima, dan invoice resmi terbuat.

---

### Tahap 9: Audit Logging System
> **Fokus**: Jejak audit kepatuhan keamanan yang merekam setiap aktivitas mutasi data.
> **Status**: ✅ COMPLETED (AuditModule + SubscriptionGuard Plan Gating + Safe Mutation Logging + Filter & Search + JSON Payload Modal + 81 Tests)

#### Checklist Pengerjaan:
- [x] Migrasi tabel `AuditLog` di Prisma schema (indexing `[organizationId, createdAt]`).
- [x] Service jejak audit (`AuditService.recordLog`): Perekaman non-blocking aman mencakup aktor, aksi, target, payload perubahan, IP address, dan User-Agent.
- [x] Rekam event kunci secara otomatis: `PROJECT_CREATED`, `PROJECT_DELETED`, `MEMBER_INVITED`, `MEMBER_JOINED`, `ROLE_CHANGED`, `MEMBER_REMOVED`, `PLAN_SWITCHED`, `PAYMENT_SUCCESS`.
- [x] Endpoint `GET /api/v1/audit-logs`: Menampilkan log aktivitas terurut kronologis dengan pagination (page, limit) dan pencarian filter.
- [x] Endpoint `GET /api/v1/audit-logs/actions`: Mengembalikan daftar tipe aksi unik untuk filter dinamis.
- [x] Plan Gating via `SubscriptionGuard` (`@RequireFeature('canViewAuditLogs')`): Membatasi fitur khusus tier Business & Enterprise.
- [x] Unit test komprehensif (`src/audit/audit.service.spec.ts`) - 81/81 tests passed di backend.
- [x] Frontend: Tab **"Audit Trail"** dengan filter aksi, pencarian real-time, badge status warna-warni, pagination bar, modal payload viewer JSON, dan upgrade banner untuk tier Free/Starter.

#### Acceptance Criteria:
- Setiap perubahan data krusial tercatat di tabel audit log secara otomatis dan tidak bisa dimodifikasi oleh user.
- Tenant pada paket Business/Enterprise dapat menelusuri riwayat aktivitas lengkap, sedangkan tier Free/Starter diarahkan untuk upgrade.

---

### Tahap 10: Transactional Email Notifications
> **Fokus**: Notifikasi otomatis untuk aksi-aksi penting sistem.
> **Status**: ✅ COMPLETED (MailModule + Nodemailer + Mock Sandbox Fallback + HTML Templates + Team & Billing Integration + 86 Tests)

#### Checklist Pengerjaan:
- [x] Setup transport email (Nodemailer v10.6.0 + TypeScript types) dengan auto-detection fallback ke mock logger bila credentials placeholder.
- [x] Template email HTML responsif & profesional:
  * Undangan bergabung tim (Invitation) dengan link aktivasi dan token manual 48 jam.
  * Konfirmasi pembayaran lunas (Invoice receipt) dengan nomor invoice dan rincian transaksi Midtrans.
  * Peringatan kuota anggota workspace mendekati batas paket.
- [x] Global `MailModule` terintegrasi dengan `TeamService.inviteMember` dan `BillingService.handleWebhook` secara non-blocking.
- [x] Unit test lengkap (`mail.service.spec.ts`) - 86/86 total tests passed di seluruh test suites backend.

#### Acceptance Criteria:
- Email undangan dan notifikasi pembayaran dikirimkan secara otomatis dengan HTML format profesional tanpa menghambat response time API.

---

### Tahap 11: Export Laporan (PDF & Excel)
> **Fokus**: Fasilitas download dokumen resmi dan rekap data spreadsheet.
> **Status**: ✅ COMPLETED (ReportModule + ExcelJS + PDFKit + Subscription Plan Gating + Frontend Downloaders + 90 Tests)

#### Checklist Pengerjaan:
- [x] Export Excel (`exceljs`):
  * `GET /api/v1/reports/projects/excel`: Rekap proyek terstruktur (.xlsx) dengan header bergaya indigo, info tenant, kolom lengkap, dan auto-styling.
  * `GET /api/v1/reports/audit-logs/excel`: Rekap jejak audit keamanan operasional (.xlsx) hingga 500 riwayat transaksi terkini.
- [x] Export PDF (`pdfkit`):
  * `GET /api/v1/reports/invoices/:id/pdf`: Faktur kuitansi resmi berstandar korporat berformat A4 dengan badge hijau LUNAS/PAID, identitas tenant, rincian langganan, Order ID, dan digital stamp BizFlow.
- [x] Feature Plan Gating via `SubscriptionGuard` (`@RequireFeature('canExportReports')`): Membatasi fitur ekspor dokumen resmi khusus untuk tier Starter, Business, dan Enterprise.
- [x] Frontend:
  * Tombol **"Export Excel"** di tab Projects.
  * Tombol **"Export Excel"** di tab Audit Trail.
  * Tombol **"Unduh PDF Resmi"** di modal detail Invoice tagihan.
  * Notifikasi peringatan upgrade otomatis bila pengguna berada di paket Free.
- [x] Unit test komprehensif (`report.service.spec.ts`) - 90/90 total tests passed di seluruh test suites backend.

#### Acceptance Criteria:
- File Excel dan PDF berhasil diunduh secara langsung dengan layout profesional, data valid terisolasi tenant, dan pembatasan fitur berdasarkan paket langganan aktif.

---

### Tahap 12: Containerization & Production Deployment
> **Fokus**: Menjalankan seluruh ekosistem di server VPS Linux dengan standar production.

#### Checklist Pengerjaan:
- [ ] Buat multi-stage `Dockerfile` untuk Backend NestJS.
- [ ] Buat multi-stage `Dockerfile` untuk Frontend Next.js (output standalone).
- [ ] Buat `docker-compose.yml` yang menghubungkan: `api`, `web`, `postgres`, dan `redis`.
- [ ] Setup VPS Linux Ubuntu (UFW firewall, Docker engine).
- [ ] Konfigurasi Nginx Reverse Proxy untuk routing domain:
  * `app.bizflow.com` -> Frontend Next.js
  * `api.bizflow.com` -> Backend NestJS
- [ ] Pasang SSL gratis via Certbot / Let's Encrypt (HTTPS).
- [ ] Jalankan database migration di server (`prisma migrate deploy`).

#### Acceptance Criteria:
- Aplikasi dapat diakses publik via domain HTTPS dengan response stabil dan seluruh container berjalan *healthy*.
