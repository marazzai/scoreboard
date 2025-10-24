/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Prisma test start');
  const role = await prisma.role.create({ data: { name: 'admin' } });
  console.log('Created role', role);

  const perm = await prisma.permission.create({ data: { name: 'manage_users' } });
  console.log('Created permission', perm);

  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
  console.log('Linked role and permission');

  const r = await prisma.role.findUnique({ where: { id: role.id }, include: { rolePermissions: { include: { permission: true } }, users: true } });
  console.log(JSON.stringify(r, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
