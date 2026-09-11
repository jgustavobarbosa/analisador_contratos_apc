import { useState } from 'react';
import { brl } from './kpis';

export type InsightCard = {
  insightId: string;
  title: string;
  estimatedImpactBrl: number;
  contractualEvidence: string;
  actionLabel: string;
  distortionType: string;
};

export type AdditiveDraftView = {
  documentTitle: string;
  fullText: string;
  disclaimer: string;
};

type Props = {
  insights: InsightCard[];
  loading?: boolean;
  executiveSummary?: string | null;
  onGenerateMinuta: (insight: InsightCard) => Promise<AdditiveDraftView | null>;
};

/**
 * Feed inteligente de recomendações prescritivas (copiloto LLM).
 */
export function AiRecommendationPanel({
  insights,
  loading,
  executiveSummary,
  onGenerateMinuta,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdditiveDraftView | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(insight: InsightCard) {
    setBusyId(insight.insightId);
    setError(null);
    try {
      const result = await onGenerateMinuta(insight);
      if (!result) {
        setError('Não foi possível gerar a minuta.');
        return;
      }
      setDraft(result);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-ray-border bg-ray-card shadow-xl shadow-black/30">
      <header className="border-b border-ray-border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ray-cyan">
          Recomendações ativas da IA · EPIC-8 / LLM
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">
          Copiloto prescritivo
        </h2>
        {executiveSummary ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {executiveSummary}
          </p>
        ) : null}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl bg-ray-bg"
              />
            ))}
          </div>
        )}

        {!loading && insights.length === 0 && (
          <p className="text-sm text-slate-500">
            Aguardando diagnóstico do copiloto…
          </p>
        )}

        {!loading &&
          insights.map((ins) => (
            <article
              key={ins.insightId}
              className="rounded-xl border border-ray-border bg-[#0d111a] p-3 transition hover:border-ray-cyan/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-semibold leading-snug text-white">
                  ▶ {ins.title}
                </h3>
                <span className="inline-flex shrink-0 rounded-md bg-ray-neon/15 px-2 py-0.5 text-xs font-bold text-ray-neon">
                  {brl(ins.estimatedImpactBrl)}/mês
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                <span className="font-medium text-slate-300">
                  Evidência contratual:{' '}
                </span>
                {ins.contractualEvidence}
              </p>
              <button
                type="button"
                disabled={busyId === ins.insightId}
                onClick={() => void handleGenerate(ins)}
                className="mt-3 rounded-lg border border-ray-cyan/30 bg-ray-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {busyId === ins.insightId
                  ? 'Gerando minuta…'
                  : `${ins.actionLabel} / Notificação`}
              </button>
            </article>
          ))}

        {error ? (
          <p className="text-sm text-ray-alert">{error}</p>
        ) : null}
      </div>

      {draft ? (
        <div className="border-t border-ray-border bg-ray-bg/80 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ray-cyan">
              {draft.documentTitle}
            </h3>
            <button
              type="button"
              className="text-xs text-slate-400 hover:text-white"
              onClick={() => setDraft(null)}
            >
              Fechar
            </button>
          </div>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-ray-border bg-ray-card p-3 font-sans text-xs leading-relaxed text-slate-300">
            {draft.fullText}
          </pre>
          <p className="mt-2 text-[11px] text-ray-warning">{draft.disclaimer}</p>
        </div>
      ) : null}
    </section>
  );
}
