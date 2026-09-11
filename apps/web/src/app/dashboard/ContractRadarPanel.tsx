import { brl } from './kpis';

export type RankingRow = {
  contractId: string;
  label: string;
  score: number;
  isBenchmark: boolean;
  dailyRateBrl?: number;
  alertNote?: string;
};

type Props = {
  rows: RankingRow[];
  loading?: boolean;
  segmentLabel: string;
};

export function ContractRadarPanel({ rows, loading, segmentLabel }: Props) {
  return (
    <section className="rounded-2xl border border-ray-border bg-ray-card p-4 shadow-xl shadow-black/30">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ray-cyan">
        Radar comparativo de contratos · EPIC-10
      </p>
      <h2 className="mt-1 text-lg font-semibold text-white">
        Ranking · {segmentLabel}
      </h2>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-ray-bg" />
          ))}
        </div>
      ) : (
        <ol className="mt-4 space-y-2">
          {rows.map((r, idx) => (
            <li
              key={r.contractId}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                r.isBenchmark
                  ? 'border-ray-neon/40 bg-ray-neon/5'
                  : r.alertNote
                    ? 'border-ray-alert/35 bg-ray-alert/5'
                    : 'border-ray-border bg-[#0d111a]'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {idx + 1}. {r.label}
                  {r.isBenchmark ? (
                    <span className="ml-2 text-[10px] font-semibold uppercase text-ray-neon">
                      Benchmark
                    </span>
                  ) : null}
                </p>
                {r.alertNote ? (
                  <p className="mt-0.5 text-xs text-ray-alert">{r.alertNote}</p>
                ) : null}
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-ray-cyan">
                  Score {r.score}
                </p>
                {r.dailyRateBrl != null ? (
                  <p className="text-xs text-slate-400">
                    {brl(r.dailyRateBrl)}/diária
                  </p>
                ) : null}
              </div>
            </li>
          ))}
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">Sem ranking carregado.</p>
          ) : null}
        </ol>
      )}
    </section>
  );
}
