import type { ReactNode } from 'react';
import { brl } from './kpis';
import type { DashboardKpis, EfficiencyBadge } from './types';

type Props = {
  kpis: DashboardKpis | null;
  loading: boolean;
  networkScore?: number | null;
};

function badgeCls(badge: EfficiencyBadge): string {
  if (badge === 'Excelente') return 'bg-ray-neon/15 text-ray-neon';
  if (badge === 'Regular') return 'bg-ray-warning/15 text-ray-warning';
  return 'bg-ray-alert/15 text-ray-alert';
}

function KpiCard({
  eyebrow,
  value,
  children,
  accent = 'default',
}: {
  eyebrow: string;
  value: string;
  children: ReactNode;
  accent?: 'default' | 'alert' | 'neon' | 'cyan' | 'warn';
}) {
  const accentBorder =
    accent === 'alert'
      ? 'border-ray-alert/35'
      : accent === 'neon'
        ? 'border-ray-neon/35'
        : accent === 'cyan'
          ? 'border-ray-cyan/35'
          : accent === 'warn'
            ? 'border-ray-warning/35'
            : 'border-ray-border';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${accentBorder} bg-ray-card p-4 shadow-lg shadow-black/30`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-ray-gradient-subtle opacity-90"
        aria-hidden
      />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {eyebrow}
        </p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
          {value}
        </p>
        <div className="mt-2 space-y-1 text-sm text-slate-400">{children}</div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="h-28 animate-pulse rounded-2xl border border-ray-border bg-ray-card" />
  );
}

export function KpiPanel({ kpis, loading, networkScore }: Props) {
  if (loading || !kpis) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  const score = networkScore ?? kpis.eficienciaScore;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        eyebrow="Volume sob gestão"
        value={`${brl(kpis.volumeFaturado * 30)}`}
        accent="default"
      >
        <p>/mês (extrapolação do lote demo)</p>
        <p className="text-slate-500">Lote pontual: {brl(kpis.volumeFaturado)}</p>
      </KpiCard>

      <KpiCard
        eyebrow="Risco glosa identificado"
        value={brl(kpis.riscoGlosaEvitavel)}
        accent="warn"
      >
        <p>
          <span className="font-semibold text-ray-warning">
            {kpis.riscoGlosaPct}%
          </span>{' '}
          do volume faturado
        </p>
      </KpiCard>

      <KpiCard
        eyebrow="Benchmark competitivo"
        value={`${score}/100`}
        accent="cyan"
      >
        <p>
          Score rede{' '}
          <span
            className={`ml-1 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${badgeCls(kpis.eficienciaBadge)}`}
          >
            {kpis.eficienciaBadge}
          </span>
        </p>
      </KpiCard>

      <KpiCard
        eyebrow="Ações imediatas"
        value={String(kpis.alertasRiscoAlto)}
        accent="alert"
      >
        <p>
          {kpis.glosaIminenteCount} glosa · {kpis.alertasCriticosAns} ANS ·
          antifraude
        </p>
      </KpiCard>
    </div>
  );
}
