type CatalogAlert = {
  alertId: string;
  severity: string;
  kind: string;
  message: string;
  internalCode?: string;
  evidence?: Record<string, number | string | boolean | null>;
};

type Props = {
  alerts: CatalogAlert[];
  loading?: boolean;
};

export function CatalogFraudPanel({ alerts, loading }: Props) {
  return (
    <section className="rounded-2xl border border-ray-border bg-ray-card p-4 shadow-xl shadow-black/30">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ray-cyan">
        Catálogo de insumos & antifraude · EPIC-11
      </p>
      <h2 className="mt-1 text-lg font-semibold text-white">
        Desvios e de-para
      </h2>

      {loading ? (
        <div className="mt-4 h-24 animate-pulse rounded-lg bg-ray-bg" />
      ) : (
        <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {alerts.slice(0, 8).map((a) => (
            <li
              key={a.alertId}
              className="rounded-lg border border-ray-border bg-[#0d111a] px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white">
                  {a.internalCode ?? a.kind}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase ${
                    a.severity === 'critical'
                      ? 'text-ray-alert'
                      : a.severity === 'medium'
                        ? 'text-ray-warning'
                        : 'text-slate-400'
                  }`}
                >
                  {a.severity}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{a.message}</p>
              {a.evidence?.peerMedian != null && a.evidence?.unitPrice != null ? (
                <p className="mt-1 text-xs text-ray-warning">
                  Cobrado R${' '}
                  {Number(a.evidence.unitPrice).toLocaleString('pt-BR')} ·
                  Mediana R${' '}
                  {Number(a.evidence.peerMedian).toLocaleString('pt-BR')}
                </p>
              ) : null}
            </li>
          ))}
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum desvio no lote demo.</p>
          ) : null}
        </ul>
      )}
    </section>
  );
}
