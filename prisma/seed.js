/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Ensure a single ObsSetting row exists with sane defaults from env
  const host = process.env.OBS_HOST || 'localhost';
  const port = parseInt(process.env.OBS_PORT || '4455', 10);
  const password = process.env.OBS_PASSWORD || null;

  await prisma.obsSetting.upsert({
    where: { id: 1 },
    update: {
      host,
      port,
      password,
    },
    create: {
      host,
      port,
      password,
    },
  });

  console.log('Seed completed: ObsSetting ensured.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
