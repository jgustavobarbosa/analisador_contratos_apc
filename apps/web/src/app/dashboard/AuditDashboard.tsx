import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdequacyMatrixPanel } from './AdequacyMatrixPanel';
import { AiRecommendationPanel, type InsightCard } from './AiRecommendationPanel';
import { CatalogFraudPanel } from './CatalogFraudPanel';
import { CostBenchmarkPanel } from './CostBenchmarkPanel';
import { computeKpis } from './kpis';
import { ContractRadarPanel } from './ContractRadarPanel';
import { KpiPanel } from './KpiPanel';
import { LineageCompliancePanel } from './LineageCompliancePanel';
import {
  GlossaryTriggerButton,
  MethodologyGlossaryDrawer,
} from './MethodologyGlossaryDrawer';
import { TopControlBar } from './TopControlBar';
import {
  OPERADORA_PRESETS,
  PROVIDER_TYPE_PRESETS,
  TENANT_PRESETS,
  type DataTrackMode,
  type DemoProfile,
  type ProviderType,
} from './types';
import { api } from '../../api';

type FetchProfile = (
  path: string,
) => Promise<{ ok: boolean; data: DemoProfile | null; error?: string }>;

type AnalyticsBundle = {
  catalogAlerts: Array<{
    alertId: string;
    severity: string;
    kind: string;
    message: string;
    internalCode?: string;
    evidence?: Record<string, number | string | boolean | null>;
  }>;
  ranking: {
    benchmarkLabel: string;
    ranking: Array<{
      contractId: string;
      label: string;
      score: number;
      isBenchmark: boolean;
      marginLeakageNotes: string[];
      renegotiationOpportunities: string[];
    }>;
  };
  fraudAlerts: Array<{
    alertId: string;
    severity: string;
    title: string;
    message: string;
  }>;
};

type DiagnosisResponse = {
  executiveSummary: string;
  insights: InsightCard[];
};

type Props = {
  fetchJson: FetchProfile;
};

export function AuditDashboard({ fetchJson }: Props) {
  const [track, setTrack] = useState<DataTrackMode>('simulation');
  const [tenantId, setTenantId] = useState(TENANT_PRESETS[0].id);
  const [providerType, setProviderType] = useState<ProviderType>(
    TENANT_PRESETS[0].providerType,
  );
  const [operadoraId, setOperadoraId] = useState(OPERADORA_PRESETS[1].id);
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsBundle | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  const tenant =
    TENANT_PRESETS.find((t) => t.id === tenantId) ?? TENANT_PRESETS[0];
  const operadora =
    OPERADORA_PRESETS.find((o) => o.id === operadoraId) ?? OPERADORA_PRESETS[0];
  const segmentLabel =
    PROVIDER_TYPE_PRESETS.find((p) => p.id === providerType)?.label ??
    providerType;

  function handleProviderTypeChange(next: ProviderType) {
    setProviderType(next);
    const match = TENANT_PRESETS.find((t) => t.providerType === next);
    if (match) setTenantId(match.id);
  }

  function handleTenantChange(id: string) {
    setTenantId(id);
    const t = TENANT_PRESETS.find((x) => x.id === id);
    if (t) setProviderType(t.providerType);
  }

  const loadAdvisor = useCallback(
    async (p: DemoProfile, a: AnalyticsBundle | null) => {
      setAdvisorLoading(true);
      const subject = a?.ranking.ranking.find((r) =>
        r.label.includes(tenant.label.split(' ')[0]),
      ) ?? a?.ranking.ranking[1];
      const benchmark = a?.ranking.ranking.find((r) => r.isBenchmark);

      const glosaByTuss = new Map<
        string,
        { count: number; amount: number }
      >();
      for (const g of p.guides.filter((x) => x.glosaRiskLevel !== 'low')) {
        const cur = glosaByTuss.get(g.tussCode) ?? { count: 0, amount: 0 };
        cur.count += 1;
        cur.amount += g.informedAmount * g.glosaProbability;
        glosaByTuss.set(g.tussCode, cur);
      }

      const body = {
        track: 'simulation' as const,
        tenantLabel: tenant.label,
        providerSegment: providerType,
        operadoraLabel: operadora.label,
        dossier: {
          activeClauses: p.dossier.activeClauses,
          additives: p.dossier.additives.map((ad) => ({
            version: ad.version,
            title: ad.title,
            effectiveAt: ad.effectiveAt,
            summary: ad.summary,
          })),
        },
        benchmark: benchmark
          ? {
              benchmarkLabel: benchmark.label,
              benchmarkScore: benchmark.score,
              subjectScore: subject?.score ?? 61,
              subjectLabel: subject?.label ?? tenant.label,
              priceGapPct: 31,
              renegotiationHints: subject?.renegotiationOpportunities ?? [],
            }
          : undefined,
        recurrentGlosas: [...glosaByTuss.entries()].map(([tussCode, v]) => ({
          tussCode,
          count: v.count,
          amountAtRiskBrl: Math.round(v.amount),
          reason: 'Glosa técnica recorrente no lote simulado',
        })),
        volumeMensalEstimadoBrl: Math.round(
          p.guides.reduce((s, g) => s + g.expectedAmount, 0) * 30,
        ),
        judicialDemandSignal: 'moderado' as const,
      };

      const res = await api<DiagnosisResponse>('/api/advisor/contract-diagnosis', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setAdvisorLoading(false);
      if (res.ok && res.data) setDiagnosis(res.data);
      else setDiagnosis(null);
    },
    [operadora.label, providerType, tenant.label],
  );

  useEffect(() => {
    if (track !== 'simulation') {
      setProfile(null);
      setAnalytics(null);
      setDiagnosis(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const seed =
      operadoraId === 'unimed' ? 42 : operadoraId === 'bradesco' ? 7 : 19;

    void (async () => {
      const [profileRes, analyticsRes] = await Promise.all([
        fetchJson(
          `/demo/providers/${providerType}/profile?mode=mock&guideCount=20&seed=${seed}`,
        ),
        api<AnalyticsBundle>(
          `/demo/analytics/providers/${providerType}?seed=${seed}&guideCount=20`,
        ),
      ]);

      if (cancelled) return;
      setLoading(false);

      if (!profileRes.ok || !profileRes.data) {
        setError(profileRes.error ?? 'Falha ao carregar perfil.');
        setProfile(null);
        return;
      }

      const p = {
        ...profileRes.data,
        party: { ...profileRes.data.party, legalName: tenant.label },
      };
      setProfile(p);
      const a = analyticsRes.ok ? analyticsRes.data : null;
      setAnalytics(a);
      void loadAdvisor(p, a);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    track,
    providerType,
    tenant.label,
    operadoraId,
    fetchJson,
    loadAdvisor,
  ]);

  const kpis = useMemo(
    () => (profile ? computeKpis(profile) : null),
    [profile],
  );

  const radarRows = useMemo(() => {
    const ranking = analytics?.ranking.ranking ?? [];
    const dailyBase = [1200, 1350, 1780];
    return ranking.map((r, i) => ({
      contractId: r.contractId,
      label: r.label,
      score: r.score,
      isBenchmark: r.isBenchmark,
      dailyRateBrl: dailyBase[i] ?? 1500 + i * 100,
      alertNote:
        !r.isBenchmark && r.score < 70
          ? `Alerta: ${r.marginLeakageNotes[0] ?? 'acima da média da rede'}`
          : undefined,
    }));
  }, [analytics]);

  const networkScore = analytics?.ranking.ranking.find((r) =>
    r.label.toLowerCase().includes('santa clara'),
  )?.score;

  async function onGenerateMinuta(insight: InsightCard) {
    const res = await api<{
      documentTitle: string;
      fullText: string;
      disclaimer: string;
    }>('/api/advisor/generate-clause-renegotiation', {
      method: 'POST',
      body: JSON.stringify({
        track: 'simulation',
        tenantLabel: tenant.label,
        providerSegment: providerType,
        operadoraLabel: operadora.label,
        insightId: insight.insightId,
        distortionType: insight.distortionType,
        title: insight.title,
        contractualEvidence: insight.contractualEvidence,
        estimatedImpactBrl: insight.estimatedImpactBrl,
      }),
    });
    if (!res.ok || !res.data) return null;
    return res.data;
  }

  return (
    <div className="space-y-5 font-sans text-slate-100">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ray-cyan">
            RAY.IA · Auditoria preditiva
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Central executiva de contratos
          </h1>
        </div>
        <div className="ray-h-scroll items-center text-xs text-slate-400 sm:flex-wrap sm:overflow-visible">
          <GlossaryTriggerButton onClick={() => setGlossaryOpen(true)} />
          <span className="rounded-full border border-ray-border bg-ray-card px-3 py-1 whitespace-nowrap">
            Tenant: {operadora.label}
          </span>
          <span className="rounded-full border border-ray-border bg-ray-card px-3 py-1 whitespace-nowrap">
            Segmento: {segmentLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ray-neon/30 bg-ray-neon/10 px-3 py-1 whitespace-nowrap text-ray-neon">
            <span className="h-1.5 w-1.5 rounded-full bg-ray-neon" />
            {track === 'simulation' ? 'Modo Simulação' : 'Produção'}
          </span>
        </div>
      </div>

      <MethodologyGlossaryDrawer
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
      />

      <TopControlBar
        track={track}
        onTrackChange={setTrack}
        tenantId={tenantId}
        onTenantChange={handleTenantChange}
        providerType={providerType}
        onProviderTypeChange={handleProviderTypeChange}
        operadoraId={operadoraId}
        onOperadoraChange={setOperadoraId}
        loading={loading}
      />

      {track === 'production' ? (
        <div className="rounded-2xl border border-ray-border bg-ray-card p-6">
          <h2 className="text-lg font-semibold text-white">
            Ambiente de Produção
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            O copiloto e o radar visual usam a base sintética. Dados reais:
            aba <strong className="text-ray-cyan">Dossiê</strong>.
          </p>
        </div>
      ) : (
        <>
          {error ? (
            <p className="rounded-lg border border-ray-alert/40 bg-ray-alert/10 px-3 py-2 text-sm text-ray-alert">
              {error}
            </p>
          ) : null}

          <KpiPanel
            kpis={kpis}
            loading={loading}
            networkScore={networkScore}
          />

          <AdequacyMatrixPanel
            profile={profile}
            loading={loading}
            contractId={`${providerType}-${tenantId}-${operadoraId}`}
            tenantLabel={tenant.label}
            providerSegment={providerType}
            operadoraLabel={operadora.label}
          />

          <div className="grid gap-5 xl:grid-cols-2">
            <CostBenchmarkPanel profile={profile} loading={loading} />
            <AiRecommendationPanel
              insights={diagnosis?.insights ?? []}
              loading={advisorLoading || loading}
              executiveSummary={diagnosis?.executiveSummary}
              onGenerateMinuta={onGenerateMinuta}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <ContractRadarPanel
              rows={radarRows}
              loading={loading}
              segmentLabel={segmentLabel}
            />
            <LineageCompliancePanel profile={profile} loading={loading} />
          </div>

          <CatalogFraudPanel
            alerts={[
              ...(analytics?.catalogAlerts ?? []),
              ...(analytics?.fraudAlerts ?? []).map((f) => ({
                alertId: f.alertId,
                severity: f.severity,
                kind: 'fraud',
                message: `${f.title}: ${f.message}`,
              })),
            ]}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
