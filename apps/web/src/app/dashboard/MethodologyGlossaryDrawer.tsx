import { useEffect, useMemo, useState } from 'react';

type GlossaryEntry = {
  id: string;
  term: string;
  category: 'metodologia' | 'glossario';
  body: string;
};

const ENTRIES: GlossaryEntry[] = [
  {
    id: 'm-score-global',
    term: 'Score Global de Aderência',
    category: 'metodologia',
    body: 'Combina quatro pilares ponderados: Financeiro 35%, Regulatório ANS 25%, Operacional 25% e Jurídico 15%. Resultado de 0–100% indica o quão alinhado o contrato está às melhores práticas da rede e às normas ANS.',
  },
  {
    id: 'm-risco-glosa',
    term: 'O que mede o Score de Risco de Glosa?',
    category: 'metodologia',
    body: 'Estima a probabilidade de rejeição/glosa antes do envio da guia, com base em regras (e, no futuro, LightGBM+SHAP). Valores altos pedem revisão humana — a IA é segunda opinião, nunca decisão final em produção.',
  },
  {
    id: 'm-economia',
    term: 'Como calculamos a Economia Estimada?',
    category: 'metodologia',
    body: 'Somamos o impacto financeiro potencial (R$) dos itens do checklist em status PARCIAL ou NÃO CONFORME — teto OPME, unbundling, gap vs mediana de rede, pré-autorização etc. É uma projeção de captura, não um crédito contábil.',
  },
  {
    id: 'm-benchmark',
    term: 'Benchmark de rede vs ANS',
    category: 'metodologia',
    body: 'Comparamos o preço contratado com a mediana de peers do mesmo segmento (rede) e um proxy de referência regulatória/tabela. Gaps >10–15% sinalizam renegociação prioritária.',
  },
  {
    id: 'g-tuss',
    term: 'TUSS',
    category: 'glossario',
    body: 'Terminologia Unificada da Saúde Suplementar — códigos padronizados de procedimentos, materiais e taxas usados no intercâmbio com operadoras.',
  },
  {
    id: 'g-tiss',
    term: 'TISS',
    category: 'glossario',
    body: 'Troca de Informações na Saúde Suplementar — padrão ANS de mensagens eletrônicas (guias, faturamento, autorização) entre prestadores e operadoras.',
  },
  {
    id: 'g-glosa-linear',
    term: 'Glosa Linear vs. Administrativa',
    category: 'glossario',
    body: 'Glosa linear corta valor proporcional (ex.: quantidade/preço). Glosa administrativa rejeita por regra de processo (documentação, autorização, prazo, elegibilidade).',
  },
  {
    id: 'g-unbundling',
    term: 'Unbundling',
    category: 'glossario',
    body: 'Cobrança separada de itens que já deveriam estar embutidos em pacote, diária ou taxa de sala (ex.: gases medicinais avulsos). Prática tipicamente glosável e alvo de aditivo corretivo.',
  },
  {
    id: 'g-rn510',
    term: 'RN 510/2022',
    category: 'glossario',
    body: 'Resolução Normativa da ANS sobre reajuste e regras econômico-financeiras aplicáveis a contratos — exige clareza de índices, prazos e transparência.',
  },
  {
    id: 'g-rn507',
    term: 'RN 507/2022',
    category: 'glossario',
    body: 'Marco ANS de adequação e transparência econômico-financeira na relação entre operadoras e prestadores, incluindo anexos de preço e pacotes.',
  },
  {
    id: 'g-rdc36',
    term: 'RDC 36/2013',
    category: 'glossario',
    body: 'Regulamento da Anvisa sobre segurança do paciente em serviços de saúde — protocolos e evidências entram no pilar regulatório da matriz.',
  },
  {
    id: 'g-shap',
    term: 'SHAP values',
    category: 'glossario',
    body: 'Valores que explicam quanto cada fator (feature) empurra o risco de glosa para cima ou para baixo. No dashboard, viram barras de impacto em linguagem executiva.',
  },
  {
    id: 'g-cbhpm',
    term: 'CBHPM / SIMPRO / Brasíndice',
    category: 'glossario',
    body: 'Referências de mercado para honorários (CBHPM), materiais/OPME (SIMPRO) e medicamentos (Brasíndice). Usadas na dispersão de preços do pilar Financeiro.',
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MethodologyGlossaryDrawer({ open, onClose }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ENTRIES;
    return ENTRIES.filter(
      (e) =>
        e.term.toLowerCase().includes(q) || e.body.toLowerCase().includes(q),
    );
  }, [query]);

  const metodologia = filtered.filter((e) => e.category === 'metodologia');
  const glossario = filtered.filter((e) => e.category === 'glossario');

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-ray-border bg-ray-card shadow-2xl shadow-black/50 transition-transform duration-300 ease-out sm:max-w-md ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Metodologia e glossário"
      >
        <header className="flex items-start justify-between gap-3 border-b border-ray-border px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ray-cyan">
              Manual metodológico
            </p>
            <h2 className="text-lg font-semibold text-white">
              Metodologia & Glossário
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-ray-border px-2 py-1 text-sm text-slate-300 hover:border-ray-cyan/40"
          >
            Fechar
          </button>
        </header>

        <div className="border-b border-ray-border px-4 py-3">
          <label className="block text-xs text-slate-500">
            Busca rápida
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex.: unbundling, RN 510, SHAP…"
              className="mt-1 w-full rounded-lg border border-ray-border bg-ray-bg px-3 py-2 text-sm text-white outline-none focus:border-ray-cyan/50 focus:ring-2 focus:ring-ray-cyan/20"
            />
          </label>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Guia de interpretação
            </h3>
            <ul className="space-y-2">
              {metodologia.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-ray-border bg-[#0d111a] p-3"
                >
                  <p className="text-sm font-semibold text-white">{e.term}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {e.body}
                  </p>
                </li>
              ))}
              {metodologia.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum resultado.</p>
              ) : null}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Glossário inteligente
            </h3>
            <ul className="space-y-2">
              {glossario.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-ray-border bg-[#0d111a] p-3"
                >
                  <p className="text-sm font-semibold text-ray-cyan">{e.term}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {e.body}
                  </p>
                </li>
              ))}
              {glossario.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum termo encontrado.</p>
              ) : null}
            </ul>
          </section>
        </div>
      </aside>
    </>
  );
}

export function GlossaryTriggerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-ray-border bg-ray-card px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-ray-cyan/40 hover:text-white sm:px-3"
      title="Metodologia & Glossário"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-ray-cyan/40 text-[11px] font-bold text-ray-cyan">
        ?
      </span>
      <span className="sm:hidden">Glossário</span>
      <span className="hidden sm:inline">Metodologia & Glossário</span>
    </button>
  );
}
