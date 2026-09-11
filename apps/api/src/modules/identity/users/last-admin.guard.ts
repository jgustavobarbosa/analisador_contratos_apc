/**
 * Prevents removing/disabling the last active admin in a tenant.
 * Pure helper for unit tests and UsersService.
 */
export function wouldRemoveLastAdmin(params: {
  targetIsAdmin: boolean;
  targetIsActive: boolean;
  activeAdminCount: number;
  action: 'disable' | 'demote' | 'delete';
}): boolean {
  if (!params.targetIsAdmin || !params.targetIsActive) {
    return false;
  }
  if (params.action === 'disable' || params.action === 'demote' || params.action === 'delete') {
    return params.activeAdminCount <= 1;
  }
  return false;
}
