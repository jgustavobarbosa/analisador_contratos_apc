import { useCallback } from 'react';
import { AuditDashboard } from '@dashboard/AuditDashboard';
import type { DemoProfile } from '@dashboard/types';
import { api } from '../../api';

/**
 * Bridge: apps/web → dashboard (Prompt 3).
 * Path público do monorepo: src/app/dashboard → symlink para cá.
 */
export function AuditDashboardPage() {
  const fetchJson = useCallback(async (path: string) => {
    const res = await api<DemoProfile>(path);
    return {
      ok: res.ok,
      data: res.data,
      error: res.ok ? undefined : 'Falha ao carregar perfil demo',
    };
  }, []);

  return (
    <div className="dashboard-root -mx-1">
      <AuditDashboard fetchJson={fetchJson} />
    </div>
  );
}
