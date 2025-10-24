/* eslint-disable @typescript-eslint/no-require-imports */
const prisma = require('./dist/src/lib/prisma').default || require('./src/lib/prisma').default;

async function main() {
  console.log('Prisma test start');
  // create role
  const role = await prisma.role.create({ data: { name: 'admin' } });
  console.log('Created role', role);

  // create permission
  const perm = await prisma.permission.create({ data: { name: 'manage_users' } });
  console.log('Created permission', perm);

  // create join RolePermission
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
  console.log('Linked role and permission');

  // fetch role with permissions
  const r = await prisma.role.findUnique({ where: { id: role.id }, include: { rolePermissions: { include: { permission: true } }, users: true } });
  console.log(JSON.stringify(r, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
