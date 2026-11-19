import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding subscription plans...');

  const plans = [
    {
      name: 'FREE',
      price: 0,
      maxMembers: 2,
      canExportReports: false,
      canViewAuditLogs: false,
    },
    {
      name: 'STARTER',
      price: 99000,
      maxMembers: 5,
      canExportReports: true,
      canViewAuditLogs: false,
    },
    {
      name: 'BUSINESS',
      price: 299000,
      maxMembers: 20,
      canExportReports: true,
      canViewAuditLogs: true,
    },
    {
      name: 'ENTERPRISE',
      price: 999000,
      maxMembers: 100,
      canExportReports: true,
      canViewAuditLogs: true,
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }

  console.log('✅ Subscription plans seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
