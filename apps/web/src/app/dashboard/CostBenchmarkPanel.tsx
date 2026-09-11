import { useMemo } from 'react';
import { brl } from './kpis';
import type { DemoProfile } from './types';

type BarRow = {
  label: string;
  code: string;
  contracted: number;
  networkMedian: number;
  ansBenchmark: number;
};

type Props = {
  profile: DemoProfile | null;
  loading?: boolean;
};

function buildRows(profile: DemoProfile): BarRow[] {
  const prices = [...profile.dossier.priceTable]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const labels: Record<string, string> = {
    '90250010': 'Diária UTI',
    '70705010': 'OPME / Stent',
    '10101012': 'Consulta eletiva',
    '10101039': 'Consulta especializada',
    '30715010': 'Procedimento ambulatorial',
    '40301000': 'Exame complementar',
    '50000100': 'Diária home care',
    '50000200': 'Pacote enfermagem',
    '60001000': 'Medicamento especial',
  };

  return prices.map((p, i) => {
    const networkMedian = Math.round(p.amount * (0.82 + (i % 3) * 0.03));
    const ansBenchmark = Math.round(networkMedian * 0.95);
    return {
      label: labels[p.code] ?? `Procedimento ${p.code}`,
      code: p.code,
      contracted: p.amount,
      networkMedian,
      ansBenchmark,
    };
  });
}

function HorzBars({ row }: { row: BarRow }) {
  const max = Math.max(row.contracted, row.networkMedian, row.ansBenchmark, 1);
  const pct = (n: number) => `${Math.round((n / max) * 100)}%`;

  return (
    <div className="space-y-1.5 rounded-xl border border-ray-border bg-[#0d111a] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-white">
          {row.label}{' '}
          <span className="text-xs font-normal text-slate-500">
            TUSS {row.code}
          </span>
        </p>
        {row.contracted > row.networkMedian * 1.1 ? (
          <span className="text-[10px] font-semibold uppercase text-ray-alert">
            +
            {Math.round(
              ((row.contracted - row.networkMedian) / row.networkMedian) * 100,
            )}
            % vs rede
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase text-ray-neon">
            Dentro da faixa
          </span>
        )}
      </div>
      {(
        [
          ['Contratado', row.contracted, 'bg-ray-blue'],
          ['Mediana rede', row.networkMedian, 'bg-ray-cyan'],
          ['Benchmark ANS', row.ansBenchmark, 'bg-ray-neon'],
        ] as const
      ).map(([label, value, bar]) => (
        <div key={label} className="grid grid-cols-[minmax(0,5.5rem)_1fr_minmax(0,4.5rem)] items-center gap-1.5 sm:grid-cols-[110px_1fr_72px] sm:gap-2">
          <span className="truncate text-[10px] text-slate-500 sm:text-[11px]">
            {label}
          </span>
          <div className="h-2 min-w-0 overflow-hidden rounded-full bg-ray-border/80">
            <div
              className={`h-full rounded-full transition-all duration-500 ${bar}`}
              style={{ width: pct(value) }}
            />
          </div>
          <span className="truncate text-right text-[10px] font-medium text-slate-300 sm:text-[11px]">
            {brl(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CostBenchmarkPanel({ profile, loading }: Props) {
  const rows = useMemo(
    () => (profile ? buildRows(profile) : []),
    [profile],
  );
  const top3 = profile?.qualityScorecard?.improvementPoints.slice(0, 3) ?? [];
  const annualGain = top3.reduce((s, p) => s + p.savingEstimate * 12, 0);

  if (loading) {
    return (
      <div className="h-72 animate-pulse rounded-2xl border border-ray-border bg-ray-card" />
    );
  }

  return (
    <section className="rounded-2xl border border-ray-border bg-ray-card p-4 shadow-xl shadow-black/30">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ray-cyan">
        Análise comparativa & benchmark de custos
      </p>
      <h2 className="mt-1 text-lg font-semibold text-white">
        Preço contratado vs rede vs ANS
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Top procedimentos do dossiê sintético (CBHPM/SIMPRO/Brasíndice proxy).
      </p>

      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <HorzBars key={r.code} row={r} />
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">Sem tabela de preços no perfil.</p>
        ) : null}
      </div>

      <div className="mt-5 rounded-xl border border-ray-neon/25 bg-ray-neon/5 p-4">
        <h3 className="text-sm font-semibold text-ray-neon">
          Plano de captura de economia
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Top 3 cláusulas a renegociar para aproximar o benchmark · ganho
          estimado{' '}
          <strong className="text-ray-neon">{brl(annualGain)}/ano</strong>
        </p>
        <ol className="mt-3 space-y-2">
          {top3.map((p, i) => (
            <li
              key={`${p.title}-${i}`}
              className="rounded-lg border border-ray-border bg-ray-card px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-white">
                  {i + 1}. {p.title}
                </span>
                <span className="text-xs font-semibold text-ray-neon">
                  {brl(p.savingEstimate * 12)}/ano
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{p.action}</p>
            </li>
          ))}
          {top3.length === 0 ? (
            <p className="text-sm text-slate-500">Sem oportunidades ranqueadas.</p>
          ) : null}
        </ol>
      </div>
    </section>
  );
}
