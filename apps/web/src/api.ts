export type Me = {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  permissions: string[];
};

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const headers = new Headers(init?.headers);
  const isFormData =
    typeof FormData !== 'undefined' && init?.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers,
  });
  if (res.status === 204) return { ok: res.ok, status: res.status, data: null };
  const data = (await res.json().catch(() => null)) as T | null;
  return { ok: res.ok, status: res.status, data };
}

export function hasPermission(me: Me | null, code: string): boolean {
  return Boolean(me?.permissions?.includes(code));
}

export function shortChecksum(checksum: string | null | undefined): string {
  if (!checksum) return '—';
  return checksum.slice(0, 12);
}
