/**
 * EPIC-8 — Process Optimizer (TRACK REAL).
 * Shared enums/contracts. Never ingest simulation generator output as training truth.
 */

export const TRACK_REAL = 'real' as const;
export type DataTrack = typeof TRACK_REAL | 'simulation';

/** Taxonomia de causas-raiz operacionais (cluster labels). */
export enum RootCauseKind {
  CADASTRO_DIVERGENCE = 'CADASTRO_DIVERGENCE',
  CLINICAL_JUSTIFICATION_MISSING = 'CLINICAL_JUSTIFICATION_MISSING',
  REGULATORY_DEADLINE_BREACH = 'REGULATORY_DEADLINE_BREACH',
  AUTHORIZATION_DELAY = 'AUTHORIZATION_DELAY',
  PRICE_TABLE_MISMATCH = 'PRICE_TABLE_MISMATCH',
  PROTOCOL_DEVIATION = 'PROTOCOL_DEVIATION',
  OTHER = 'OTHER',
}

export type TimeGranularity = 'day' | 'week' | 'month';

export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

export type AnomalySeverity = 'info' | 'warning' | 'critical';
