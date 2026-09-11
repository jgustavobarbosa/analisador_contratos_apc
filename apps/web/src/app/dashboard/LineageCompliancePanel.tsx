import type { DemoProfile } from './types';

type Props = {
  profile: DemoProfile | null;
  loading?: boolean;
};

/** Linhagem contratual + compliance ANS (EPIC-2 / EPIC-5). */
export function LineageCompliancePanel({ profile, loading }: Props) {
  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-2xl border border-ray-border bg-ray-card" />
    );
  }

  const additives = profile?.dossier.additives ?? [];
  const alerts = profile?.regulatoryAlerts ?? [];

  return (
    <section className="rounded-2xl border border-ray-border bg-ray-card p-4 shadow-xl shadow-black/30">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ray-cyan">
        Linhagem & compliance ANS · EPIC-2 / EPIC-5
      </p>
      <h2 className="mt-1 text-lg font-semibold text-white">
        Vigência e radar regulatório
      </h2>

      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-ray-border bg-[#0d111a] px-3 py-2 text-sm text-slate-300">
          <p className="font-medium text-white">Contrato raiz → aditivos</p>
          <p className="mt-1 text-xs text-slate-400">
            {additives.length === 0
              ? 'Sem aditivos no perfil.'
              : additives
                  .map(
                    (a) =>
                      `Aditivo ${a.version} (${a.effectiveAt})${
                        a.version === additives.length ? ' · Vigente' : ''
                      }`,
                  )
                  .join(' → ')}
          </p>
        </div>

        <ul className="space-y-2">
          {alerts.slice(0, 4).map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-ray-border bg-[#0d111a] px-3 py-2"
            >
              <p className="text-sm font-medium text-white">{a.title}</p>
              <p className="text-xs text-slate-400">
                [{a.regulation}] {a.message}
              </p>
              {a.dueInDays != null ? (
                <p className="mt-1 text-xs font-medium text-ray-warning">
                  {a.regulation.includes('510') || a.dueInDays <= 30
                    ? `Prazo: ${a.dueInDays} dias`
                    : `Vigência em ${a.dueInDays} dias`}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
