/** Shared demo types for the audit dashboard (TRACK SIMULATION). */

export type ProviderType =
  | 'HOSPITAL'
  | 'CLINICA'
  | 'HOME_CARE'
  | 'LABORATORIO_IMAGEM';

export type DataTrackMode = 'simulation' | 'production';

export type TenantPreset = {
  id: string;
  label: string;
  providerType: ProviderType;
};

export type OperadoraPreset = {
  id: string;
  label: string;
};

export type ProviderTypePreset = {
  id: ProviderType;
  label: string;
};

export const PROVIDER_TYPE_PRESETS: ProviderTypePreset[] = [
  { id: 'HOSPITAL', label: 'Hospital' },
  { id: 'CLINICA', label: 'Clínica / SADT' },
  { id: 'HOME_CARE', label: 'Home Care' },
  { id: 'LABORATORIO_IMAGEM', label: 'Laboratório / Imagem' },
];

export const TENANT_PRESETS: TenantPreset[] = [
  {
    id: 'hospital-santa-clara',
    label: 'Hospital Santa Clara',
    providerType: 'HOSPITAL',
  },
  {
    id: 'clinica-cardiovida',
    label: 'Clínica CardioVida',
    providerType: 'CLINICA',
  },
  {
    id: 'vital-home-care',
    label: 'Vital Home Care',
    providerType: 'HOME_CARE',
  },
  {
    id: 'lab-diagnostica',
    label: 'Lab Diagnóstica',
    providerType: 'LABORATORIO_IMAGEM',
  },
];

export const OPERADORA_PRESETS: OperadoraPreset[] = [
  { id: 'bradesco', label: 'Bradesco Saúde' },
  { id: 'unimed', label: 'Unimed' },
  { id: 'sulamerica', label: 'SulAmérica' },
];

export type DemoProfile = {
  track: string;
  providerType: ProviderType;
  party: { legalName: string; focus: string; cnpjFake: string };
  dossier: {
    activeClauses: Array<{
      code: string;
      title: string;
      text: string;
      ansReajusteLimitPct: number;
    }>;
    additives: Array<{
      version: number;
      title: string;
      effectiveAt: string;
      signedAt: string;
      summary: string;
      extractedFields: Array<{
        path: string;
        confidence: number;
        status: string;
      }>;
    }>;
    coverageCodes: Array<{ code: string; action: string; effectiveAt: string }>;
    priceTable: Array<{ code: string; amount: number; effectiveAt: string }>;
  };
  guides: Array<{
    guideId: string;
    tussCode: string;
    attendanceAt: string;
    informedAmount: number;
    expectedAmount: number;
    glosaProbability: number;
    glosaRiskLevel: 'low' | 'medium' | 'high';
    explanatoryFeatures: Array<{
      feature: string;
      shapValue: number;
      direction: string;
    }>;
    alerts: string[];
  }>;
  regulatoryAlerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    regulation: string;
    title: string;
    dueInDays: number | null;
    message: string;
  }>;
  processDiagnosis: {
    model: string;
    bottleneck: string;
    estimatedMonthlyLossPct: number;
    recommendation: string;
    confidence: number;
  };
  qualityScorecard?: {
    overallScore: number;
    scoreByDimension: Record<
      string,
      { score: number; maxScore: number; status: string }
    >;
    totalEstimatedSavings: number;
    improvementPoints: Array<{
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      title: string;
      gap: string;
      action: string;
      savingEstimate: number;
      dimension: string;
    }>;
    checklist: Array<{
      id: string;
      dimension: string;
      title: string;
      status: 'CONFORME' | 'PARCIAL' | 'NAO_CONFORME';
      evidence: string;
      financialImpactPotential: number;
      recommendedAction: string;
    }>;
    checklistCount: number;
    formula: string;
  };
};

export type EfficiencyBadge = 'Excelente' | 'Regular' | 'Crítico';

export type DashboardKpis = {
  volumeFaturado: number;
  /** EPIC-4 — glosa evitável estimada */
  riscoGlosaEvitavel: number;
  riscoGlosaPct: number;
  riscoTrendPct: number;
  /** EPIC-10 — proxy de economia contratual (benchmark) */
  potencialEconomiaContratual: number;
  /** Score 0–100 eficiência do contrato */
  eficienciaScore: number;
  eficienciaBadge: EfficiencyBadge;
  /** Glosa iminente + ANS + anomalias */
  alertasRiscoAlto: number;
  alertasCriticosAns: number;
  glosaIminenteCount: number;
};
