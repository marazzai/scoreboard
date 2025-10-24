/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main(){
  const user = await prisma.user.findUnique({ where: { username: 'admin' }, include: { role: true } });
  console.log('admin user:', user);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
