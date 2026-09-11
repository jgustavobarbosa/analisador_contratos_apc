import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  DEMO_ME,
  hasPermission,
  isDemoSession,
  setDemoSession,
  type Me,
} from './api';
import { BrandLogo } from './components/BrandLogo';
import { LoginPage } from './features/auth/LoginPage';
import { ResetConfirmPage } from './features/auth/ResetConfirmPage';
import { ResetRequestPage } from './features/auth/ResetRequestPage';
import { CatalogPage } from './features/catalog/CatalogPage';
import { AuditDashboardPage } from './features/dashboard/AuditDashboardPage';
import { DossierPage } from './features/dossier/DossierPage';
import { SimulationLabPage } from './features/simulation/SimulationLabPage';
import { UsersAdminPage } from './features/users/UsersAdminPage';

type AuthView = 'login' | 'reset-request' | 'reset-confirm';
type AppTab = 'dashboard' | 'dossier' | 'catalog' | 'simulation' | 'users';

function tokenFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('token') ?? '';
}

function initialAuthView(): AuthView {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  if (params.get('token') || path.includes('reset/confirm')) {
    return 'reset-confirm';
  }
  if (path.includes('reset')) return 'reset-request';
  return 'login';
}

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [authView, setAuthView] = useState<AuthView>(initialAuthView);
  const [tab, setTab] = useState<AppTab>('dashboard');
  const [message, setMessage] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const resetToken = useMemo(() => tokenFromUrl(), []);

  const refreshMe = useCallback(async () => {
    if (isDemoSession()) {
      setMe(DEMO_ME);
      setDemoMode(true);
      return;
    }
    const res = await api<Me>('/me');
    if (res.ok && res.data) {
      setMe(res.data);
      setDemoMode(false);
    } else {
      setMe(null);
      setDemoMode(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  async function onLogout() {
    if (!isDemoSession()) {
      await api('/auth/logout', { method: 'POST' });
    }
    setDemoSession(false);
    setDemoMode(false);
    setMe(null);
    setTab('dossier');
    setMessage(null);
    setAuthView('login');
  }

  if (!me) {
    if (authView === 'reset-request') {
      return (
        <ResetRequestPage
          onBack={() => setAuthView('login')}
          onGoConfirm={() => setAuthView('reset-confirm')}
        />
      );
    }
    if (authView === 'reset-confirm') {
      return (
        <ResetConfirmPage
          initialToken={resetToken}
          onBack={() => setAuthView('login')}
          onDone={() => setAuthView('login')}
        />
      );
    }
    return (
      <LoginPage
        onLoggedIn={(user) => {
          setMe(user);
          setDemoMode(isDemoSession());
          setAuthView('login');
          setMessage(null);
        }}
        onGoReset={() => setAuthView('reset-request')}
      />
    );
  }

  const canManageUsers = hasPermission(me, 'user:write');
  const canReadCatalog = hasPermission(me, 'catalog:read');

  return (
    <main className="shell shell--wide min-w-0 overflow-x-hidden font-sans text-slate-100">
      <header className="topbar mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-ray-border pb-4 sm:mb-6 sm:gap-4 sm:pb-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <BrandLogo height={28} className="sm:hidden" />
            <BrandLogo height={36} className="hidden sm:block" />
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-ray-border bg-ray-card px-2.5 py-1 sm:px-3 sm:py-1.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ray-neon opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ray-neon" />
              </span>
              <span className="truncate text-[11px] font-medium text-slate-300 sm:text-xs">
                <span className="sm:hidden">IA Ativa</span>
                <span className="hidden sm:inline">
                  IA Ativa · Auditoria em Tempo Real
                </span>
              </span>
            </div>
            {demoMode ? (
              <span className="rounded-full border border-ray-warning/40 bg-ray-warning/10 px-2.5 py-1 text-[11px] font-semibold text-ray-warning">
                Modo Demonstração
              </span>
            ) : null}
          </div>
          <div className="min-w-0">
            <h1 className="m-0 text-lg font-semibold tracking-tight text-white sm:text-xl md:text-2xl">
              Analisador preditivo de contratos
            </h1>
            <p className="lede lede--tight mt-1 text-xs text-slate-400 sm:text-sm">
              <span className="ray-break">
                {me.email} · {me.role}
              </span>
              <span className="hidden sm:inline">
                {' '}
                · IA como segunda opinião; revisão humana obrigatória em
                produção.
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost shrink-0 rounded-lg border border-ray-border bg-transparent px-3 py-2 text-sm font-medium text-ray-cyan hover:border-ray-cyan/50"
          onClick={() => void onLogout()}
        >
          Sair
        </button>
      </header>

      <nav
        className="tabs ray-h-scroll mb-4 border-b border-ray-border pb-3 sm:mb-6 sm:flex-wrap sm:overflow-visible"
        aria-label="Seções"
      >
        {(
          [
            { id: 'dashboard' as const, label: 'Dashboard', show: true },
            { id: 'dossier' as const, label: 'Dossiê', show: true },
            { id: 'catalog' as const, label: 'Catálogo', show: canReadCatalog },
            { id: 'simulation' as const, label: 'Simulação', show: true },
            { id: 'users' as const, label: 'Usuários', show: canManageUsers },
          ] as Array<{ id: AppTab; label: string; show: boolean }>
        )
          .filter((t) => t.show)
          .map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={
                  active
                    ? 'tab active shrink-0 rounded-lg border border-ray-cyan/40 bg-ray-blue/90 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white'
                    : 'tab shrink-0 rounded-lg border border-transparent bg-ray-card px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-300 hover:border-ray-border hover:text-white'
                }
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            );
          })}
      </nav>

      <div className="min-w-0">
        {tab === 'dashboard' ? (
          <AuditDashboardPage />
        ) : tab === 'dossier' ? (
          <DossierPage me={me} onMessage={setMessage} />
        ) : tab === 'catalog' && canReadCatalog ? (
          <CatalogPage me={me} onMessage={setMessage} />
        ) : tab === 'simulation' ? (
          <SimulationLabPage />
        ) : canManageUsers ? (
          <UsersAdminPage canWrite={canManageUsers} />
        ) : null}
      </div>

      {message ? (
        <p className="status mt-4 rounded-lg border border-ray-border bg-ray-card px-3 py-2 text-sm text-ray-cyan ray-break">
          {message}
        </p>
      ) : null}
    </main>
  );
}
