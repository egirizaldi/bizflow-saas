import Link from 'next/link';
import {
  Building2,
  ShieldCheck,
  Zap,
  Users,
  CreditCard,
  BarChart3,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
            <div className="p-1.5 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            BizFlow
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
            >
              Mulai Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Enterprise Multi-Tenant SaaS Architecture
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Kelola Operasional Bisnis & Tim dalam{' '}
          <span className="text-indigo-600">Satu Platform Terisolasi</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto">
          BizFlow memungkinkan banyak perusahaan memiliki ruang kerja sendiri, mengelola hak akses tim, mengontrol langganan, dan memantau analitik secara terisolasi.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition"
          >
            Daftar Sekarang
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition"
          >
            Masuk ke Workspace
          </Link>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900">
              Fitur Lengkap Skala Perusahaan
            </h2>
            <p className="mt-3 text-slate-600">
              Dibangun dengan teknologi teruji untuk performa tinggi dan keamanan isolasi tenant 100%.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl w-fit mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Isolasi Multi-Tenant</h3>
              <p className="text-slate-600 text-sm">
                Shared PostgreSQL database dengan tenant-scoping guard otomatis. Data organisasi Anda tidak akan pernah bocor ke perusahaan lain.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-xl w-fit mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">RBAC & Team Management</h3>
              <p className="text-slate-600 text-sm">
                Atur peran Owner, Admin, Manager, dan Staff dengan izin wewenang granular per organisasi dan undang anggota via token email.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl w-fit mb-4">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Midtrans Payment Gateway</h3>
              <p className="text-slate-600 text-sm">
                Dukungan pembayaran instan via Virtual Account BCA/Mandiri dan QRIS dengan verifikasi notifikasi webhook otomatis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Pilihan Paket Berlangganan
          </h2>
          <p className="mt-3 text-slate-600">
            Mulai gratis dan upgrade kapan saja seiring pertumbuhan perusahaan Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Tier */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Free Plan</h3>
              <p className="text-slate-500 text-sm mt-1">Untuk uji coba & tim perintis</p>
              <div className="mt-6 text-3xl font-extrabold text-slate-900">
                Rp0 <span className="text-sm font-normal text-slate-500">/bulan</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Maksimal 2 Anggota Tim
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Dashboard Analitik Standar
                </li>
                <li className="flex items-center gap-2 text-slate-400">
                  ✕ Export Laporan PDF/Excel
                </li>
              </ul>
            </div>
            <Link
              href="/register"
              className="mt-8 block text-center py-2.5 px-4 rounded-xl border border-indigo-600 text-indigo-600 font-semibold hover:bg-indigo-50 text-sm transition"
            >
              Mulai Gratis
            </Link>
          </div>

          {/* Starter Plan */}
          <div className="bg-indigo-600 text-white p-8 rounded-2xl shadow-xl flex flex-col justify-between relative transform md:-translate-y-2">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-amber-400 text-slate-900 font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Populer
            </div>
            <div>
              <h3 className="text-xl font-bold">Starter Plan</h3>
              <p className="text-indigo-200 text-sm mt-1">Untuk perusahaan berkembang</p>
              <div className="mt-6 text-3xl font-extrabold">
                Rp99.000 <span className="text-sm font-normal text-indigo-200">/bulan</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-indigo-100">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-300" />
                  Maksimal 5 Anggota Tim
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-300" />
                  Dashboard Analitik Lengkap
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-300" />
                  Email Notifications
                </li>
              </ul>
            </div>
            <Link
              href="/register"
              className="mt-8 block text-center py-2.5 px-4 rounded-xl bg-white text-indigo-600 font-semibold hover:bg-indigo-50 text-sm shadow-md transition"
            >
              Pilih Starter
            </Link>
          </div>

          {/* Business Plan */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Business Plan</h3>
              <p className="text-slate-500 text-sm mt-1">Untuk korporasi skala penuh</p>
              <div className="mt-6 text-3xl font-extrabold text-slate-900">
                Rp299.000 <span className="text-sm font-normal text-slate-500">/bulan</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Hingga 20 Anggota Tim
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Audit Trail & Activity Logs
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Export Laporan PDF & Excel
                </li>
              </ul>
            </div>
            <Link
              href="/register"
              className="mt-8 block text-center py-2.5 px-4 rounded-xl border border-slate-300 text-slate-800 font-semibold hover:bg-slate-50 text-sm transition"
            >
              Pilih Business
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500 mt-auto">
        <p>© 2026 BizFlow SaaS Platform. Dibangun dengan Next.js, NestJS, Prisma & PostgreSQL.</p>
      </footer>
    </div>
  );
}
