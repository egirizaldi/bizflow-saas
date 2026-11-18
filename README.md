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

* **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn UI, Zustand, TanStack Query.
* **Backend**: NestJS (TypeScript), RESTful API, Passport JWT.
* **Database & ORM**: PostgreSQL, Prisma ORM (dengan Prisma Client Extensions).
* **Caching & Queue**: Redis 7.x, BullMQ.
* **Payment Gateway**: Midtrans Snap API & Webhook Notification.
* **DevOps & Infra**: Docker, Docker Compose, Nginx, Linux Ubuntu VPS, Let's Encrypt SSL.

---

## 🚀 Memulai Pengembangan

Lihat panduan langkah demi langkah pada **[ROADMAP-AND-CHECKLIST.md](file:///run/media/egi-rizaldi/Data/Download_Ubuntu/project-coba-coba/docs/ROADMAP-AND-CHECKLIST.md)** untuk memulai dari **Tahap 1: Authentication & Session Management**.
