/**
 * Golden fixture — Unimed × Oncoradium (SPEC-dossier timeline).
 *
 * Códigos de taxa de sala quimioterapia (aditivo ago/2024):
 * alinhados ao doc de produto (ex.: 89999959…) — IDs sintéticos plausíveis
 * para demo; valores R$ 325–400 conforme tabela golden.
 *
 * Extração LLM/OCR stubada: campos já “accepted” materializados em Coverage/Price.
 */

export const GOLDEN_CASE_KEY = 'unimed-oncoradium';

export const CHEMO_ROOM_FEES = [
  // taxa sala quimio — códigos sintéticos (produto: 89999959 etc.)
  { code: '89999959', amount: 325 },
  { code: '89999960', amount: 350 },
  { code: '89999961', amount: 375 },
  { code: '89999962', amount: 400 },
] as const;

export const EXCLUDED_CODE = '10101012';

/** Stable document keys inside the golden payload (not DB UUIDs). */
export const DOC_KEYS = {
  base: 'doc-base-2020',
  notify: 'doc-notify-2024-03',
  rn510: 'doc-aditivo-rn510-2024-02',
  exclude: 'doc-aditivo-exclude-2024-07',
  chemo: 'doc-aditivo-chemo-2024-08',
} as const;

export type GoldenDocument = {
  key: string;
  type: 'contrato' | 'aditivo' | 'carta' | 'comunicado';
  title: string;
  eventAt?: string;
  notifiedAt?: string;
  signedAt?: string;
  effectiveAt?: string;
};

export type GoldenVersion = {
  version: number;
  effectiveFrom: string;
  causedByDocKey: string;
  summary: string;
  coverage: Array<{
    code: string;
    action: 'include' | 'exclude';
    effectiveAt: string;
  }>;
  prices: Array<{
    code: string;
    amount: number;
    effectiveAt: string;
    effectiveUntil?: string | null;
  }>;
};

export type GoldenFixture = {
  caseKey: string;
  partyA: string;
  partyB: string;
  title: string;
  documents: GoldenDocument[];
  causalLinks: Array<{
    fromDocKey: string;
    toDocKey: string;
    relation: 'motivates' | 'implements';
  }>;
  versions: GoldenVersion[];
};

export const goldenOncoradium: GoldenFixture = {
  caseKey: GOLDEN_CASE_KEY,
  partyA: 'Unimed',
  partyB: 'Oncoradium',
  title: 'Contrato Unimed–Oncoradium (caso golden)',
  documents: [
    {
      key: DOC_KEYS.base,
      type: 'contrato',
      title: 'Contrato original — oncologia',
      // 01/10/2020
      signedAt: '2020-10-01',
      effectiveAt: '2020-10-01',
      eventAt: '2020-10-01',
    },
    {
      key: DOC_KEYS.notify,
      type: 'carta',
      title: 'Notificação — suspensão radioterapia',
      // 13/03/2024
      eventAt: '2024-03-13',
      notifiedAt: '2024-03-13',
    },
    {
      key: DOC_KEYS.rn510,
      type: 'aditivo',
      title: '1º aditivo — RN510 / LGPD / checklist cadastral',
      // ~02/2024 (vigência retroativa)
      signedAt: '2024-02-15',
      effectiveAt: '2024-02-01',
      eventAt: '2024-02-01',
    },
    {
      key: DOC_KEYS.exclude,
      type: 'aditivo',
      title: '2º aditivo — exclusão código 10101012',
      // 08/07/2024
      signedAt: '2024-07-08',
      effectiveAt: '2024-07-08',
      eventAt: '2024-07-08',
    },
    {
      key: DOC_KEYS.chemo,
      type: 'aditivo',
      title: '3º aditivo — taxas de sala quimioterapia',
      // vigência 01/08/2024, assinado 06/08/2024
      effectiveAt: '2024-08-01',
      signedAt: '2024-08-06',
      eventAt: '2024-08-01',
    },
  ],
  causalLinks: [
    // Notificação 13/03 motiva o aditivo de julho (formalização)
    {
      fromDocKey: DOC_KEYS.notify,
      toDocKey: DOC_KEYS.exclude,
      relation: 'motivates',
    },
  ],
  versions: [
    {
      version: 1,
      effectiveFrom: '2020-10-01',
      causedByDocKey: DOC_KEYS.base,
      summary: 'Estado base oncologia',
      coverage: [
        {
          code: EXCLUDED_CODE,
          action: 'include',
          effectiveAt: '2020-10-01',
        },
        // placeholder oncology scope marker
        { code: 'ONCO-BASE', action: 'include', effectiveAt: '2020-10-01' },
      ],
      prices: [
        {
          code: EXCLUDED_CODE,
          amount: 80,
          effectiveAt: '2020-10-01',
          effectiveUntil: null,
        },
      ],
    },
    {
      version: 2,
      effectiveFrom: '2024-02-01',
      causedByDocKey: DOC_KEYS.rn510,
      summary: 'Obrigações regulatórias RN510/LGPD (referência documental)',
      coverage: [],
      prices: [],
    },
    {
      version: 3,
      effectiveFrom: '2024-07-08',
      causedByDocKey: DOC_KEYS.exclude,
      summary: 'Exclui código 10101012',
      coverage: [
        {
          code: EXCLUDED_CODE,
          action: 'exclude',
          effectiveAt: '2024-07-08',
        },
      ],
      // Preço aberto da v1 é fechado na reconciliação (effectiveUntil = exclusão)
      prices: [],
    },
    {
      version: 4,
      effectiveFrom: '2024-08-01',
      causedByDocKey: DOC_KEYS.chemo,
      summary: 'Inclui 4 códigos taxa sala quimio (R$ 325–400)',
      coverage: CHEMO_ROOM_FEES.map((f) => ({
        code: f.code,
        action: 'include' as const,
        effectiveAt: '2024-08-01',
      })),
      prices: CHEMO_ROOM_FEES.map((f) => ({
        code: f.code,
        amount: f.amount,
        effectiveAt: '2024-08-01',
        effectiveUntil: null,
      })),
    },
  ],
};
