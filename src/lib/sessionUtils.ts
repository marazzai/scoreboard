// No-auth mode: roles/permissions are no-ops
export function getRoleName(): string | undefined {
  return undefined;
}

export function hasPermission(): boolean {
  return true;
}
