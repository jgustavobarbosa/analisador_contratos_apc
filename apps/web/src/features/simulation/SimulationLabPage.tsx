import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import {
  AlertTriangle,
  CardFooterLink,
  CheckCircle2,
  ExecCard,
  ExecCardHeader,
  FileText,
  SegmentPill,
  ShieldAlert,
  Sparkles,
} from './ExecCard';

type ProviderType =
  | 'HOSPITAL'
  | 'CLINICA'
  | 'HOME_CARE'
  | 'LABORATORIO_IMAGEM';

type TrackMode = 'simulation' | 'production';

type Profile = {
  track: string;
  providerType: ProviderType;
  party: { legalName: string; focus: string; cnpjFake: string };
  dossier: {
    additives: Array<{ version: number; title: string; summary: string }>;
    activeClauses: Array<{
      code: string;
      title: string;
      ansReajusteLimitPct: number;
    }>;
  };
  guides: Array<{
    guideId: string;
    tussCode: string;
    informedAmount?: number;
    expectedAmount?: number;
    glosaProbability: number;
    glosaRiskLevel: string;
    explanatoryFeatures: Array<{ feature: string; shapValue: number }>;
  }>;
  regulatoryAlerts: Array<{
    title: string;
    severity: string;
    dueInDays: number | null;
    message: string;
    regulation: string;
  }>;
  processDiagnosis: {
    bottleneck: string;
    estimatedMonthlyLossPct: number;
    recommendation: string;
  };
  qualityScorecard?: {
    overallScore: number;
    scoreByDimension: Record<
      string,
      { score: number; maxScore: number; status: string }
    >;
    totalEstimatedSavings: number;
    improvementPoints: Array<{
      priority: string;
      title: string;
      action: string;
      savingEstimate: number;
      dimension: string;
    }>;
    checklistCount: number;
    formula: string;
  };
};

const TYPES: Array<{ id: ProviderType; label: string }> = [
  { id: 'HOSPITAL', label: 'Hospital' },
  { id: 'CLINICA', label: 'Clínica' },
  { id: 'HOME_CARE', label: 'Home Care' },
  { id: 'LABORATORIO_IMAGEM', label: 'Laboratório' },
];

const SEGMENT_LABEL: Record<ProviderType, string> = {
  HOSPITAL: 'Hospital Geral',
  CLINICA: 'Clínica / SADT',
  HOME_CARE: 'Home Care',
  LABORATORIO_IMAGEM: 'Laboratório / Imagem',
};

const TUSS_LABEL: Record<string, string> = {
  '10101012': 'Consulta eletiva',
  '10101039': 'Consulta especializada',
  '90250010': 'Diária UTI adulto',
  '70705010': 'Stent farmacológico',
  '30715010': 'Procedimento ambulatorial',
  '40301000': 'Exame complementar',
  '50000100': 'Diária home care',
  '50000200': 'Pacote enfermagem 12h',
  '60001000': 'Medicamento especial',
  '40301100': 'Ressonância / imagem',
  '40301200': 'Tomografia',
};

const DIM_LABEL: Record<string, string> = {
  FINANCEIRO: 'Financeiro',
  REGULATORIO_ANS: 'Regulatório',
  OPERACIONAL: 'Operacional',
  JURIDICO: 'Jurídico',
};

function brl(n: number): string {
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function severityTone(level: string): {
  bar: string;
  tag: string;
  label: string;
} {
  const pct = level.toLowerCase();
  if (pct === 'high' || pct === 'critical') {
    return {
      bar: 'bg-ray-alert',
      tag: 'bg-ray-alert/10 text-rose-400 border-ray-alert/30',
      label: 'CRITICAL',
    };
  }
  if (pct === 'medium' || pct === 'warning') {
    return {
      bar: 'bg-ray-warning',
      tag: 'bg-ray-warning/10 text-amber-400 border-ray-warning/30',
      label: 'HIGH',
    };
  }
  return {
    bar: 'bg-ray-cyan',
    tag: 'bg-ray-cyan/10 text-ray-cyan border-ray-cyan/30',
    label: 'INFO',
  };
}

function alertBadge(severity: string): string {
  const s = severity.toLowerCase();
  if (s === 'critical' || s === 'high') {
    return 'bg-ray-alert/15 text-rose-400 border-ray-alert/40';
  }
  if (s === 'warning' || s === 'medium') {
    return 'bg-ray-warning/15 text-amber-400 border-ray-warning/40';
  }
  return 'bg-ray-cyan/15 text-ray-cyan border-ray-cyan/40';
}

function alertLabel(severity: string): string {
  const s = severity.toLowerCase();
  if (s === 'critical' || s === 'high') return 'CRITICAL';
  if (s === 'warning' || s === 'medium') return 'WARNING';
  return 'INFO';
}

export function SimulationLabPage() {
  const [mode, setMode] = useState<TrackMode>('simulation');
  const [providerType, setProviderType] = useState<ProviderType>('HOSPITAL');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionNote, setActionNote] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'simulation') {
      setProfile(null);
      setError(
        'Modo Produção: use a aba Dossiê para contratos reais. O motor sintético só roda em Simulação.',
      );
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setActionNote(null);
    void (async () => {
      const res = await api<Profile>(
        `/demo/providers/${providerType}/profile?mode=mock&guideCount=20`,
      );
      if (cancelled) return;
      setLoading(false);
      if (!res.ok || !res.data) {
        setError('Falha ao carregar perfil demo');
        setProfile(null);
        return;
      }
      setProfile(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, providerType]);

  const glosaRows = useMemo(() => {
    if (!profile) return [];
    const ranked = [...profile.guides].sort(
      (a, b) => b.glosaProbability - a.glosaProbability,
    );
    const seen = new Set<string>();
    const unique: typeof ranked = [];
    for (const g of ranked) {
      if (seen.has(g.tussCode)) continue;
      seen.add(g.tussCode);
      unique.push(g);
      if (unique.length >= 3) break;
    }
    return unique;
  }, [profile]);

  const avgRisk = useMemo(() => {
    if (!profile?.guides.length) return 0;
    const sum = profile.guides.reduce((s, g) => s + g.glosaProbability, 0);
    return (sum / profile.guides.length) * 100;
  }, [profile]);

  const exposure = useMemo(() => {
    if (!profile) return 0;
    return Math.round(
      profile.guides.reduce(
        (s, g) =>
          s + (g.informedAmount ?? g.expectedAmount ?? 0) * g.glosaProbability,
        0,
      ),
    );
  }, [profile]);

  const qs = profile?.qualityScorecard;
  const reajuste =
    profile?.dossier.activeClauses.find((c) => c.ansReajusteLimitPct > 0)
      ?.ansReajusteLimitPct ?? 6.9;
  const monthlySaving = qs
    ? Math.round(qs.totalEstimatedSavings / 12) ||
      Math.round(
        (profile?.processDiagnosis.estimatedMonthlyLossPct ?? 0) *
          3000,
      )
    : Math.round(
        ((profile?.processDiagnosis.estimatedMonthlyLossPct ?? 14) / 100) *
          300_000,
      );

  return (
    <section className="space-y-4 font-sans text-slate-100">
      <header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ray-cyan uppercase">
            Console executiva · Two-Track
          </p>
          <h2 className="m-0 mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">
            Laboratório de simulação
          </h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Motor mock por prestador · EPIC 1–5 / 8 · Sem PII de produção.
          </p>
        </div>

        <div
          className="inline-flex w-full rounded-lg border border-ray-border bg-ray-card p-0.5 sm:w-auto"
          role="group"
          aria-label="Trilha de dados"
        >
          <button
            type="button"
            onClick={() => setMode('simulation')}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition sm:flex-none ${
              mode === 'simulation'
                ? 'bg-ray-neon/15 text-ray-neon'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ray-neon" />
            Simulação
          </button>
          <button
            type="button"
            onClick={() => setMode('production')}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition sm:flex-none ${
              mode === 'production'
                ? 'bg-slate-700/60 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Produção
          </button>
        </div>
      </header>

      {mode === 'simulation' ? (
        <div className="ray-h-scroll sm:flex-wrap sm:overflow-visible">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setProviderType(t.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition ${
                providerType === t.id
                  ? 'border-ray-blue/50 bg-ray-blue text-white'
                  : 'border-ray-border bg-ray-card text-slate-400 hover:border-ray-blue/30 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl border border-ray-border bg-ray-card"
            />
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-ray-alert/30 bg-ray-alert/10 px-3 py-2 text-sm text-ray-alert">
          {error}
        </p>
      ) : null}

      {profile && mode === 'simulation' && qs ? (
        <div className="rounded-xl border border-ray-border bg-ray-card px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Scorecard 4 pilares
              </p>
              <p className="text-2xl font-semibold text-white">
                {qs.overallScore}
                <span className="text-sm font-medium text-slate-500">/100</span>
              </p>
            </div>
            <p className="text-xs font-semibold text-ray-neon">
              Economia potencial {brl(qs.totalEstimatedSavings)}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {Object.entries(qs.scoreByDimension).map(([key, dim]) => (
              <div
                key={key}
                className="rounded-lg border border-ray-border/80 bg-[#0d111a] px-2.5 py-1.5"
              >
                <p className="text-[10px] tracking-wide text-slate-500 uppercase">
                  {DIM_LABEL[key] ?? key}
                </p>
                <p className="text-sm font-semibold text-white">
                  {dim.score}{' '}
                  <span className="text-[10px] font-medium text-slate-400">
                    {dim.status}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {profile && mode === 'simulation' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Card 1 — Dossiê */}
          <ExecCard>
            <ExecCardHeader
              icon={FileText}
              title="Dossiê vivo contratual"
              pulse="live"
              pulseLabel="EPIC 1/2"
            />
            <p className="text-base font-semibold text-white ray-break">
              {profile.party.legalName}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <SegmentPill>{SEGMENT_LABEL[providerType]}</SegmentPill>
              <SegmentPill>CNPJ {profile.party.cnpjFake}</SegmentPill>
            </div>

            <ul className="mt-4 space-y-2">
              <li className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ray-neon" />
                <span>
                  Reajuste contratado:{' '}
                  <strong className="text-white">ANS ({reajuste}% máx)</strong>
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ray-neon" />
                <span>
                  Prazo recurso de glosa:{' '}
                  <strong className="text-white">30 dias</strong>
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ray-neon" />
                <span>
                  Aditivos vigentes:{' '}
                  <strong className="text-white">
                    {profile.dossier.additives.length} detectados e ativos
                  </strong>
                </span>
              </li>
            </ul>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.dossier.additives.slice(0, 3).map((a) => (
                <button
                  key={a.version}
                  type="button"
                  title={a.summary}
                  className="max-w-full truncate rounded-md border border-ray-border bg-[#0d111a] px-2 py-1 text-[11px] font-medium text-slate-300 transition hover:border-ray-cyan/40 hover:text-white"
                >
                  v{a.version}{' '}
                  {a.title.replace(/^Aditivo\s*/i, '').slice(0, 18)}
                </button>
              ))}
            </div>

            <CardFooterLink
              onClick={() =>
                setActionNote('Abra a aba Dossiê para o histórico completo.')
              }
            >
              Ver Dossiê Completo →
            </CardFooterLink>
          </ExecCard>

          {/* Card 2 — Glosa */}
          <ExecCard>
            <ExecCardHeader
              icon={AlertTriangle}
              title="Previsão de glosa em guia"
              pulse="warn"
              pulseLabel="EPIC 3/4"
            />
            <p className="text-sm text-slate-300">
              Lote sob análise:{' '}
              <strong className="text-white">
                {profile.guides.length} Guias TUSS
              </strong>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Risco médio:{' '}
              <span className="font-semibold text-rose-400">
                {avgRisk.toFixed(1)}%
              </span>
              {' · '}
              <span className="font-semibold text-ray-warning">
                {brl(exposure)}
              </span>{' '}
              em exposição
            </p>

            <ul className="mt-4 space-y-3">
              {glosaRows.map((g) => {
                const pct = Math.round(g.glosaProbability * 100);
                const tone = severityTone(g.glosaRiskLevel);
                const amount = g.informedAmount ?? g.expectedAmount ?? 0;
                return (
                  <li key={g.guideId} className="space-y-1.5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
                      <p className="min-w-0 text-sm font-medium text-white">
                        <span className="font-mono text-ray-cyan">
                          {g.tussCode}
                        </span>{' '}
                        <span className="text-slate-400">
                          {TUSS_LABEL[g.tussCode] ?? 'Procedimento TUSS'}
                        </span>
                      </p>
                      <span className="shrink-0 text-xs font-semibold text-slate-300">
                        {brl(amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background:
                              pct >= 70
                                ? 'linear-gradient(90deg, #E11D48 0%, #F43F5E 55%, #FB7185 100%)'
                                : pct >= 40
                                  ? 'linear-gradient(90deg, #D97706 0%, #F59E0B 100%)'
                                  : 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)',
                          }}
                        />
                      </div>
                      <span
                        className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${tone.tag}`}
                      >
                        {pct}% {tone.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <CardFooterLink
              onClick={() =>
                setActionNote(
                  `Lote com ${profile.guides.length} guias — filtro high-risk no dashboard de auditoria.`,
                )
              }
            >
              Ver Todas as {profile.guides.length} Guias →
            </CardFooterLink>
          </ExecCard>

          {/* Card 3 — Compliance */}
          <ExecCard>
            <ExecCardHeader
              icon={ShieldAlert}
              title="Radar de compliance ANS & Anvisa"
              pulse="live"
              pulseLabel="EPIC 5"
            />
            <p className="text-sm text-slate-300">
              Monitoramento ativo:{' '}
              <strong className="text-white">
                {profile.regulatoryAlerts.length} alertas detectados
              </strong>
            </p>

            <ul className="mt-3 space-y-2">
              {profile.regulatoryAlerts.slice(0, 3).map((a) => (
                <li
                  key={`${a.regulation}-${a.title}`}
                  className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${alertBadge(a.severity)}`}
                    >
                      {alertLabel(a.severity)}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {a.regulation}
                    </span>
                    {a.dueInDays != null ? (
                      <span className="rounded-full border border-ray-border bg-[#0d111a] px-2 py-0.5 text-[10px] font-medium text-slate-400">
                        {a.dueInDays} dias
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-slate-200">
                    {a.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                    {a.message}
                  </p>
                </li>
              ))}
            </ul>
          </ExecCard>

          {/* Card 4 — ML Process */}
          <ExecCard>
            <ExecCardHeader
              icon={Sparkles}
              title="Diagnóstico prescritivo (ML)"
              pulse="ok"
              pulseLabel="EPIC 8"
            />
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              Diagnóstico de causa-raiz por redes neurais
            </p>

            <div className="mt-3 rounded-lg border border-ray-border bg-[#0d111a] p-3">
              <span className="inline-flex rounded border border-ray-warning/30 bg-ray-warning/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-ray-warning uppercase">
                Gargalo operacional identificado
              </span>
              <p className="mt-2 text-sm font-semibold text-white">
                {profile.processDiagnosis.bottleneck}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-ray-alert/40 bg-ray-alert/10 px-2.5 py-1 text-[11px] font-semibold text-rose-400">
                  −{profile.processDiagnosis.estimatedMonthlyLossPct}% perda
                  mensal
                </span>
                <span className="rounded-full border border-ray-neon/40 bg-ray-neon/10 px-2.5 py-1 text-[11px] font-semibold text-ray-neon">
                  Economia estimada: {brl(monthlySaving)}/mês
                </span>
              </div>
            </div>

            <p className="mt-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              Recomendação prescritiva da IA
            </p>
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-slate-300">
              {profile.processDiagnosis.recommendation}
            </p>

            <button
              type="button"
              onClick={() =>
                setActionNote(
                  'Plano de ação simulado enfileirado (TRACK SIMULATION).',
                )
              }
              className="mt-auto inline-flex items-center justify-center rounded-lg bg-ray-blue px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1d4ed8]"
            >
              Aplicar Plano de Ação →
            </button>
          </ExecCard>
        </div>
      ) : null}

      {actionNote ? (
        <p className="rounded-lg border border-ray-cyan/30 bg-ray-cyan/5 px-3 py-2 text-xs text-ray-cyan">
          {actionNote}
        </p>
      ) : null}
    </section>
  );
}
