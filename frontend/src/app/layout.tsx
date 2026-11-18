import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BizFlow — Multi-Tenant SaaS Platform',
  description: 'Platform manajemen multi-tenant untuk bisnis dan organisasi modern.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
