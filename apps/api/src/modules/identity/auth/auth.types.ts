export type AuthUser = {
  id: string;
  tenantId: string;
  email: string;
  organizationId: string;
  roleId: string;
  roleCode: string;
  permissions: string[];
  sessionId: string;
};

export const SESSION_COOKIE = () =>
  process.env.SESSION_COOKIE_NAME ?? 'rayia_session';
