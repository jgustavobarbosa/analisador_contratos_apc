import type { DemoProfile } from './types';

type Props = {
  profile: DemoProfile | null;
  loading: boolean;
};

type TimelineNode = {
  id: string;
  title: string;
  detail: string;
  at: string;
  tone: 'ingest' | 'extract' | 'additive' | 'billing';
};

function toneClasses(tone: TimelineNode['tone']): string {
  switch (tone) {
    case 'ingest':
      return 'border-ray-cyan/40 bg-ray-cyan/10';
    case 'extract':
      return 'border-ray-blue/40 bg-ray-blue/10';
    case 'additive':
      return 'border-ray-warning/40 bg-ray-warning/10';
    case 'billing':
      return 'border-ray-neon/40 bg-ray-neon/10';
  }
}

export function AuditTimeline({ profile, loading }: Props) {
  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-2xl border border-ray-border bg-ray-card" />
    );
  }

  if (!profile) {
    return (
      <section className="rounded-2xl border border-ray-border bg-ray-card p-4 shadow-lg shadow-black/25">
        <h2 className="text-lg font-semibold text-white">
          Trilha de auditoria (EPIC-6)
        </h2>
        <p className="mt-2 text-sm text-slate-400">Sem linhagem carregada.</p>
      </section>
    );
  }

  const nodes: TimelineNode[] = [
    {
      id: 'ingest',
      title: 'Documento ingerido',
      detail: `Pacote contratual sintético de ${profile.party.legalName} disponível para extração.`,
      at: profile.dossier.additives[0]?.signedAt ?? '2024-02-01',
      tone: 'ingest',
    },
    {
      id: 'extract',
      title: 'Regra contratual extraída',
      detail:
        profile.dossier.activeClauses[0]?.text ??
        'Cláusulas e limites ANS identificados com confiança por campo.',
      at: profile.dossier.additives[0]?.effectiveAt ?? '2024-02-01',
      tone: 'extract',
    },
    ...profile.dossier.additives.map((a) => ({
      id: `add-${a.version}`,
      title: `Aditivo detectado v${a.version}`,
      detail: a.summary,
      at: a.effectiveAt,
      tone: 'additive' as const,
    })),
    {
      id: 'billing',
      title: 'Impacto no faturamento',
      detail: `${profile.guides.length} guias avaliadas; ${
        profile.guides.filter((g) => g.glosaRiskLevel === 'high').length
      } com risco alto de glosa antes do envio.`,
      at: profile.guides.at(-1)?.attendanceAt ?? '2024-08-28',
      tone: 'billing',
    },
  ];

  return (
    <section className="rounded-2xl border border-ray-border bg-ray-card p-4 shadow-lg shadow-black/25">
      <h2 className="text-lg font-semibold text-white">
        Trilha de auditoria e rastreabilidade
      </h2>
      <p className="mb-4 text-sm text-slate-400">
        Linhagem: Documento → Regra → Aditivo → Impacto no faturamento
      </p>
      <ol className="relative space-y-4 border-l-2 border-ray-border pl-5">
        {nodes.map((n) => (
          <li key={n.id} className="relative">
            <span className="absolute -left-[1.55rem] top-2 h-3 w-3 rounded-full border-2 border-ray-card bg-ray-gradient shadow" />
            <div
              className={`rounded-xl border p-3 transition hover:shadow-md hover:shadow-black/30 ${toneClasses(n.tone)}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-white">{n.title}</h3>
                <time className="text-xs font-medium text-slate-400">{n.at}</time>
              </div>
              <p className="mt-1 text-sm text-slate-300">{n.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
