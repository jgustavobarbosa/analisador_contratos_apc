import { useMemo, useState } from 'react';
import { api } from '../../api';
import { brl } from './kpis';
import type { DemoProfile } from './types';

const DIM_META: Record<
  string,
  { label: string; weight: string; accent: string }
> = {
  FINANCEIRO: {
    label: 'Financeiro & Tabela',
    weight: '35%',
    accent: 'border-ray-neon/40 text-ray-neon',
  },
  REGULATORIO_ANS: {
    label: 'Regulatório ANS',
    weight: '25%',
    accent: 'border-ray-cyan/40 text-ray-cyan',
  },
  OPERACIONAL: {
    label: 'Operacional',
    weight: '25%',
    accent: 'border-ray-warning/40 text-ray-warning',
  },
  JURIDICO: {
    label: 'Jurídico',
    weight: '15%',
    accent: 'border-ray-blue/40 text-ray-blue',
  },
};

function statusTone(status: string): string {
  if (status === 'CONFORME') return 'bg-ray-neon/15 text-ray-neon';
  if (status === 'PARCIAL') return 'bg-ray-warning/15 text-ray-warning';
  return 'bg-ray-alert/15 text-ray-alert';
}

function AdequacyGauge({ score }: { score: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="rayGauge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="55%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#4ADE80" />
          </linearGradient>
        </defs>
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="#1E293B"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="url(#rayGauge)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-white">{pct.toFixed(0)}%</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">
          Aderência
        </span>
      </div>
    </div>
  );
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function markdownToPrintableHtml(title: string, md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const body = escaped
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>${title}</title>
<style>
  body{font-family:Georgia,serif;max-width:720px;margin:2rem auto;color:#0f172a;line-height:1.5}
  h1,h2,h3{font-family:"IBM Plex Sans",sans-serif;color:#0A0D14}
  li{margin-left:1.2rem}
  @media print{body{margin:1rem}}
</style></head><body><p>${body}</p>
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>
</body></html>`;
}

type AuditReportApi = {
  contractId: string;
  executiveSummary: string;
  fullMarkdown: string;
  model: string;
  llmUsed: boolean;
  disclaimer: string;
};

type Props = {
  profile: DemoProfile | null;
  loading?: boolean;
  contractId?: string;
  tenantLabel?: string;
  providerSegment?: string;
  operadoraLabel?: string;
};

export function AdequacyMatrixPanel({
  profile,
  loading,
  contractId = 'demo-contract',
  tenantLabel,
  providerSegment,
  operadoraLabel,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterDim, setFilterDim] = useState<string | 'ALL'>('ALL');
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const qs = profile?.qualityScorecard;

  const rows = useMemo(() => {
    const list = qs?.checklist ?? [];
    if (filterDim === 'ALL') return list;
    return list.filter((c) => c.dimension === filterDim);
  }, [qs, filterDim]);

  async function handleExportReport() {
    if (!qs) return;
    setExporting(true);
    setExportNote(null);
    const res = await api<AuditReportApi>('/api/advisor/audit-report', {
      method: 'POST',
      headers: { 'X-Rayia-Track': 'simulation' },
      body: JSON.stringify({
        track: 'simulation',
        contractId,
        tenantLabel,
        providerSegment,
        operadoraLabel,
        scorecard: {
          overallScore: qs.overallScore,
          scoreByDimension: qs.scoreByDimension,
          checklist: qs.checklist,
          totalEstimatedSavings: qs.totalEstimatedSavings,
          improvementPoints: qs.improvementPoints,
          formula: qs.formula,
        },
      }),
    });
    setExporting(false);
    if (!res.ok || !res.data) {
      setExportNote('Falha ao gerar relatório. Tente novamente.');
      return;
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const base = `Roteiro-Adequacao-${contractId}-${stamp}`;
    downloadText(
      `${base}.md`,
      res.data.fullMarkdown,
      'text/markdown;charset=utf-8',
    );
    downloadText(
      `${base}.html`,
      markdownToPrintableHtml(
        `Relatório de Adequação — ${contractId}`,
        res.data.fullMarkdown,
      ),
      'text/html;charset=utf-8',
    );
    setExportNote(
      res.data.llmUsed
        ? `Relatório gerado via ${res.data.model} (MD + HTML para PDF).`
        : `Relatório template (${res.data.model}) — MD + HTML para imprimir/PDF.`,
    );
  }

  if (loading) {
    return (
      <div className="h-80 animate-pulse rounded-2xl border border-ray-border bg-ray-card" />
    );
  }

  if (!qs) {
    return (
      <section className="rounded-2xl border border-ray-border bg-ray-card p-4">
        <h2 className="text-lg font-semibold text-white">
          Matriz de Adequação & Oportunidades
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Scorecard indisponível neste perfil.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-ray-border bg-ray-card p-3 shadow-xl shadow-black/30 sm:p-4">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ray-cyan">
            Matriz de adequação & oportunidades de economia
          </p>
          <h2 className="mt-1 text-base font-semibold text-white sm:text-lg">
            Score global do contrato
          </h2>
          <p className="mt-1 text-xs text-slate-500 ray-break">{qs.formula}</p>
        </div>
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          <p className="rounded-lg border border-ray-neon/30 bg-ray-neon/10 px-3 py-1.5 text-center text-sm font-semibold text-ray-neon sm:text-right">
            Economia potencial {brl(qs.totalEstimatedSavings)}
          </p>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExportReport()}
            className="w-full rounded-lg border border-ray-blue/40 bg-ray-blue px-3 py-2 text-left text-xs font-semibold text-white transition hover:bg-ray-blue/90 disabled:opacity-60 sm:max-w-xs"
          >
            {exporting ? (
              'Gerando roteiro…'
            ) : (
              <>
                <span className="sm:hidden">Exportar Relatório (PDF/Doc)</span>
                <span className="hidden sm:inline">
                  Exportar Relatório de Adequação & Roteiro de Negociação
                  (PDF/Doc)
                </span>
              </>
            )}
          </button>
          {exportNote ? (
            <p className="max-w-full text-left text-[11px] text-slate-400 sm:max-w-xs sm:text-right">
              {exportNote}
            </p>
          ) : null}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[160px_1fr]">
        <div className="flex justify-center lg:block">
          <AdequacyGauge score={qs.overallScore} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(qs.scoreByDimension).map(([key, dim]) => {
            const meta = DIM_META[key] ?? {
              label: key,
              weight: '',
              accent: 'border-ray-border text-slate-300',
            };
            const gap = qs.improvementPoints.find((p) => p.dimension === key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilterDim(filterDim === key ? 'ALL' : key)}
                className={`rounded-xl border bg-[#0d111a] p-3 text-left transition hover:border-ray-cyan/40 ${
                  filterDim === key ? meta.accent : 'border-ray-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-300">
                    {meta.label}
                  </p>
                  <span className="text-[10px] text-slate-500">{meta.weight}</span>
                </div>
                <p className="mt-1 text-xl font-semibold text-white">
                  {dim.score}
                  <span className="ml-2 text-xs font-medium text-slate-400">
                    {dim.status}
                  </span>
                </p>
                {gap ? (
                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                    Gap: {gap.title}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-ray-neon">Sem gaps críticos</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">
            Checklist interativo ({rows.length})
          </h3>
          <button
            type="button"
            className="text-xs text-ray-cyan hover:underline"
            onClick={() => setFilterDim('ALL')}
          >
            Ver todos os pilares
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-ray-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#0d111a] text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Evidência</th>
                <th className="px-3 py-2 font-medium">Oportunidade</th>
                <th className="px-3 py-2 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const open = expandedId === row.id;
                return (
                  <tr
                    key={row.id}
                    className="border-t border-ray-border/80 align-top transition hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-left font-medium text-slate-100"
                        onClick={() => setExpandedId(open ? null : row.id)}
                      >
                        {open ? '▾' : '▸'} {row.title}
                      </button>
                      {open ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {DIM_META[row.dimension]?.label ?? row.dimension} ·{' '}
                          {row.id}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone(row.status)}`}
                      >
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-3 py-2 text-xs text-slate-400">
                      {row.evidence}
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold text-ray-neon">
                      {row.status === 'CONFORME'
                        ? '—'
                        : brl(row.financialImpactPotential)}
                    </td>
                    <td className="max-w-[240px] px-3 py-2 text-xs text-slate-300">
                      {row.recommendedAction}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
