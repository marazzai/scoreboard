import prisma from './prisma';

type Enriched = { role: string | null; permissions: string[] };

export async function enrichTokenWithPermissions(userId: string): Promise<Enriched> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } }
  });

  let role: string | null = null;
  let permissions: string[] = [];
  if (dbUser?.role) {
    role = dbUser.role.name;
    const rps = dbUser.role.rolePermissions as Array<{ permission: { name: string } }>;
    permissions = rps.map(rp => rp.permission.name);
  }

  return { role, permissions };
}
