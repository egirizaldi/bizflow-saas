# BizFlow — Multi-Tenant SaaS Management Platform

BizFlow adalah platform Software-as-a-Service (SaaS) B2B yang memungkinkan banyak organisasi mengelola operasional bisnis, tim, peran hak akses, dan paket langganan secara terisolasi dalam satu arsitektur aplikasi bersama (*shared database, shared schema*).

---

## 📚 Dokumentasi Proyek

Dokumentasi arsitektur dan spesifikasi proyek telah disusun secara modular di dalam folder `docs/`:

1. **[Product Requirements Document (PRD)](file:///run/media/egi-rizaldi/Data/Download_Ubuntu/project-coba-coba/docs/PRD.md)**
   * Visi produk, problem statement, dan target pengguna.
   * Matriks peran (RBAC Matrix: Owner, Admin, Manager, Staff).
   * Spesifikasi lengkap fitur utama, tier langganan, dan Non-Functional Requirements (NFR).

2. **[Skill & Kompetensi yang Dibutuhkan](file:///run/media/egi-rizaldi/Data/Download_Ubuntu/project-coba-coba/docs/SKILLS-AND-COMPETENCIES.md)**
   * Pemetaan keahlian frontend (Next.js, Tailwind, Shadcn UI, Zustand).
   * Arsitektur backend (NestJS Guards, Interceptors, Decorators).
   * Desain database & isolasi tenant (PostgreSQL, Prisma Client Extensions).
   * Payment Gateway Midtrans, Caching Redis, Docker, dan Learning Roadmap mingguan.

3. **[Arsitektur Sistem & Desain Database](file:///run/media/egi-rizaldi/Data/Download_Ubuntu/project-coba-coba/docs/SYSTEM-ARCHITECTURE-AND-DATABASE.md)**
   * Diagram arsitektur decoupled (Client, Gateway, API, DB, Midtrans).
   * Entity-Relationship Diagram (ERD) dan draf skema Prisma (`schema.prisma`) lengkap.
   * Mekanisme implementasi 3 lapis isolasi tenant di NestJS.
   * Sequence diagram transaksi Midtrans Snap & rekonsiliasi webhook.

4. **[Roadmap & Checklist Implementasi 12 Tahap](file:///run/media/egi-rizaldi/Data/Download_Ubuntu/project-coba-coba/docs/ROADMAP-AND-CHECKLIST.md)**
   * Panduan eksekusi bertahap dari Tahap 1 (Auth) hingga Tahap 12 (VPS Deployment).
   * Checklist to-do teknis dan *Acceptance Criteria* per tahap.

---

## 🛠️ Tech Stack Utama

* **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Recharts, Lucide Icons, js-cookie.
* **Backend**: NestJS 12 (TypeScript, NodeNext ESM), RESTful API, Passport JWT, Nodemailer, ExcelJS, PDFKit.
* **Database & ORM**: PostgreSQL 16, Prisma ORM 6.4 (Shared Database / Shared Schema pattern).
* **Caching & Queue**: Redis 7.x, BullMQ ready.
* **Payment Gateway**: Midtrans Snap API & Webhook Notification (dengan Sandbox Mock Simulator).
* **DevOps & Infra**: Docker multi-stage builds, Docker Compose, Nginx reverse proxy, Ubuntu Linux.

---

## 🚀 Panduan Menjalankan Aplikasi

### Opsi A: Menggunakan Docker Compose (Production-Ready)
Sistem dapat dijalankan secara instan mencakup PostgreSQL, Redis, NestJS Backend, Next.js Standalone Frontend, dan Nginx Gateway:

1. **Salin environment configuration**:
   ```bash
   cp .env.docker.example .env
   ```
2. **Jalankan seluruh service dalam kontainer**:
   ```bash
   docker compose up -d --build
   ```
3. **Akses aplikasi**:
   - Web App (Nginx Gateway): `http://localhost`
   - REST API: `http://localhost/api/v1`
   - Healthcheck: `http://localhost/healthz`

### Opsi B: Menjalankan Secara Lokal (Development Mode)

1. **Prasyarat**:
   - Node.js v22+
   - Yarn (`npm install -g yarn`)
   - PostgreSQL berjalan di `localhost:5432`

2. **Backend Setup**:
   ```bash
   cd backend
   yarn install --ignore-engines
   cp .env.example .env
   npx prisma migrate dev
   npx tsx prisma/seed.ts
   yarn start:dev
   ```
   *Backend REST API aktif di `http://localhost:3001/api/v1`*

3. **Frontend Setup**:
   ```bash
   cd frontend
   yarn install --ignore-engines
   yarn dev
   ```
   *Frontend Next.js aktif di `http://localhost:3000`*

4. **Menjalankan Unit Test**:
   ```bash
   cd backend
   yarn test
   # Seluruh 14 test suites (90 unit tests) akan berjalan otomatis via Vitest
   ```

---

## 🏆 Ringkasan Status 12 Tahapan Roadmap

Semua 12 tahap implementasi produksi telah berhasil diselesaikan 100%:
1. **Tahap 1: Authentication & Session Management** (JWT, Refresh Token, Bcrypt, Login/Register UI) ✅
2. **Tahap 2: Workspace / Organization Management** (Auto-slug, Org Switcher, Multi-Org Membership) ✅
3. **Tahap 3: Multi-Tenant Data Isolation** (TenantGuard, CurrentTenant Decorator, Scoped Project Service) ✅
4. **Tahap 4: Role-Based Access Control (RBAC)** (RolesGuard, Can Component, Dynamic Permissions Matrix) ✅
5. **Tahap 5: Team Management & Invitations** (48-hr Invitations, Token Activation, Role Changer, Member Kick) ✅
6. **Tahap 6: Dashboard Analytics & Metrics** (AnalyticsService, Tenant Metrics, SuperAdmin Global View, Recharts) ✅
7. **Tahap 7: Subscription Management & Plan Gating** (SubscriptionGuard, Quota Enforcer, Pricing Matrix 4 Tiers) ✅
8. **Tahap 8: Payment Gateway Integration** (Midtrans Snap, SHA512 Webhook Signature, Idempotent Auto-Renewal) ✅
9. **Tahap 9: Audit Logging System** (Non-blocking Safe Audit Trail, Action Filters, Real-time Search, JSON Viewer) ✅
10. **Tahap 10: Transactional Email Notifications** (Nodemailer v10.6, Mock Sandbox Fallback, Responsive HTML Templates) ✅
11. **Tahap 11: Export Laporan PDF & Excel** (ExcelJS Project & Audit Logs, PDFKit Formal A4 Invoices with Plan Gating) ✅
12. **Tahap 12: Containerization & Production Deployment** (Multi-Stage Dockerfiles, Standalone Next.js, Docker Compose, Nginx Reverse Proxy) ✅
