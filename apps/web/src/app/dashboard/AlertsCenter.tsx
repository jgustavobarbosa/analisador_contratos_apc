import { useMemo, useState } from 'react';
import type { DemoProfile } from './types';
import { brl } from './kpis';
import { ImpactBars } from './ImpactBars';

type TabId = 'glosa' | 'processo' | 'regulatorio';

type Props = {
  profile: DemoProfile | null;
  loading: boolean;
  operadoraLabel: string;
};

function SeverityBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    high: 'bg-ray-alert/20 text-ray-alert',
    critical: 'bg-ray-alert/20 text-ray-alert',
    medium: 'bg-ray-warning/20 text-ray-warning',
    warning: 'bg-ray-warning/20 text-ray-warning',
    low: 'bg-ray-neon/20 text-ray-neon',
    info: 'bg-ray-cyan/20 text-ray-cyan',
  };
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${map[level] ?? 'bg-ray-border text-slate-300'}`}
    >
      {level}
    </span>
  );
}

export function AlertsCenter({ profile, loading, operadoraLabel }: Props) {
  const [tab, setTab] = useState<TabId>('glosa');

  const imminent = useMemo(() => {
    if (!profile) return [];
    return [...profile.guides]
      .filter((g) => g.glosaRiskLevel !== 'low')
      .sort((a, b) => b.glosaProbability - a.glosaProbability)
      .slice(0, 12);
  }, [profile]);

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'glosa', label: 'Risco iminente de glosa' },
    { id: 'processo', label: 'Recomendações estruturais' },
    { id: 'regulatorio', label: 'Radar regulatório' },
  ];

  return (
    <section className="rounded-2xl border border-ray-border bg-ray-card shadow-xl shadow-black/30">
      <div className="border-b border-ray-border px-4 pt-4">
        <h2 className="text-lg font-semibold text-white">
          Central de alertas e pontos de controle
        </h2>
        <p className="mb-3 text-sm text-slate-400">
          Operadora sob análise:{' '}
          <strong className="text-ray-cyan">{operadoraLabel}</strong>
        </p>
        <div className="flex flex-wrap gap-2 pb-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-ray-blue text-white'
                  : 'bg-transparent text-slate-500 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[440px] overflow-y-auto p-4">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-ray-bg"
              />
            ))}
          </div>
        )}

        {!loading && !profile && (
          <p className="text-sm text-slate-400">
            Selecione a base sintética para carregar alertas.
          </p>
        )}

        {!loading && profile && tab === 'glosa' && (
          <ul className="space-y-3">
            {imminent.map((g) => (
              <li
                key={g.guideId}
                className="rounded-xl border border-ray-border bg-[#0d111a] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">
                      Guia {g.guideId} · TUSS {g.tussCode}
                    </p>
                    <p className="text-sm text-slate-400">
                      Atendimento {g.attendanceAt} · informado{' '}
                      {brl(g.informedAmount)} vs esperado {brl(g.expectedAmount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <SeverityBadge level={g.glosaRiskLevel} />
                    <p className="mt-1 text-sm font-semibold text-ray-alert">
                      {(g.glosaProbability * 100).toFixed(0)}% risco
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Impacto no risco (explicação executiva)
                </p>
                <ImpactBars features={g.explanatoryFeatures} />
              </li>
            ))}
          </ul>
        )}

        {!loading && profile && tab === 'processo' && (
          <div className="rounded-xl border border-ray-neon/30 bg-ray-neon/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ray-neon">
              EPIC-8 · {profile.processDiagnosis.model}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Raiz do problema: {profile.processDiagnosis.bottleneck}
            </h3>
            <p className="mt-2 text-slate-300">
              {profile.processDiagnosis.recommendation}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="rounded-lg border border-ray-border bg-ray-card px-3 py-2 text-sm text-slate-200">
                Ganho estimado:{' '}
                <strong className="text-ray-neon">
                  {profile.processDiagnosis.estimatedMonthlyLossPct}% / mês
                </strong>
              </div>
              <div className="rounded-lg border border-ray-border bg-ray-card px-3 py-2 text-sm text-slate-200">
                Confiança:{' '}
                <strong className="text-ray-cyan">
                  {(profile.processDiagnosis.confidence * 100).toFixed(0)}%
                </strong>
              </div>
            </div>
          </div>
        )}

        {!loading && profile && tab === 'regulatorio' && (
          <ul className="space-y-3">
            {profile.regulatoryAlerts.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-ray-border bg-[#0d111a] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{a.title}</p>
                    <p className="text-sm text-slate-400">
                      [{a.regulation}] {a.message}
                    </p>
                  </div>
                  <SeverityBadge level={a.severity} />
                </div>
                {a.dueInDays != null && (
                  <p className="mt-2 text-sm font-medium text-ray-warning">
                    Vigência / prazo: {a.dueInDays} dias
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
