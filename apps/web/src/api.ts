export type Me = {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  permissions: string[];
};

/** Base da API Nest (ex.: https://api.exemplo.com). Vazio = mesma origem (proxy local). */
export function apiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!raw) return '';
  return raw.replace(/\/$/, '');
}

export function isDemoSession(): boolean {
  return sessionStorage.getItem('rayia_demo_session') === '1';
}

export function setDemoSession(active: boolean): void {
  if (active) sessionStorage.setItem('rayia_demo_session', '1');
  else sessionStorage.removeItem('rayia_demo_session');
}

export const DEMO_ME: Me = {
  id: 'demo-user',
  email: 'demo@rayia.local',
  role: 'admin',
  tenantId: 'demo-tenant',
  permissions: [
    'dossier:read',
    'dossier:write',
    'catalog:read',
    'user:read',
    'user:write',
  ],
};

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const headers = new Headers(init?.headers);
  const isFormData =
    typeof FormData !== 'undefined' && init?.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${apiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      credentials: 'include',
      ...init,
      headers,
    });
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error:
        'API inacessível. No Vercel configure VITE_API_BASE_URL apontando para o Nest em execução.',
    };
  }

  if (res.status === 204) return { ok: res.ok, status: res.status, data: null };

  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();
  if (
    contentType.includes('text/html') ||
    text.trimStart().startsWith('<!DOCTYPE') ||
    text.trimStart().startsWith('<html')
  ) {
    return {
      ok: false,
      status: res.status,
      data: null,
      error:
        'Resposta HTML no lugar da API (rota /auth sem backend). Defina VITE_API_BASE_URL no Vercel.',
    };
  }

  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: 'Resposta inválida da API.',
    };
  }

  return { ok: res.ok, status: res.status, data };
}

export function hasPermission(me: Me | null, code: string): boolean {
  return Boolean(me?.permissions?.includes(code));
}

export function shortChecksum(checksum: string | null | undefined): string {
  if (!checksum) return '—';
  return checksum.slice(0, 12);
}
