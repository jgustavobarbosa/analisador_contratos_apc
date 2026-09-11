import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, hasPermission, shortChecksum, type Me } from '../../api';

type ContractRow = {
  id: string;
  partyA: string;
  partyB: string;
  title: string | null;
  status: string;
};

type TimelineEvent = {
  documentId: string;
  type: string;
  title: string;
  dates: {
    eventAt: string | null;
    notifiedAt: string | null;
    signedAt: string | null;
    effectiveAt: string | null;
  } | null;
  causalLinks: Array<{
    relation: string;
    direction: string;
    otherDocumentId: string;
  }>;
};

type PriceResult = {
  code: string;
  at: string;
  covered: boolean;
  amount?: number;
  currency?: string;
  warnings: string[];
};

type ContractDocument = {
  id: string;
  type: string;
  title: string;
  checksum: string | null;
  storageKey: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
};

type ReviewItem = {
  id: string;
  path: string;
  valueJson: unknown;
  confidence: number;
  status: string;
  documentId: string;
  documentTitle: string;
};

type SimulationAlert = {
  type: string;
  message: string;
  informed?: number;
  expected?: number;
};

type RiskResult = {
  score: number;
  level: 'low' | 'medium' | 'high';
  reasons: string[];
  features?: Record<string, number | boolean>;
};

type SimulationRow = {
  id: string;
  code: string;
  attendanceAt: string;
  informedAmount: number | null;
  expectedAmount: number | null;
  covered: boolean;
  alerts: SimulationAlert[];
  risk?: RiskResult | null;
  riskNotes?: RiskResult | null;
  createdAt: string;
};

type ComplianceItem = {
  id: string;
  code: string;
  title: string;
  requiredBy: string;
  dueAt: string | null;
  status: string;
  alertLevel: null | 60 | 30 | 7 | 'expired';
};

type AuditItem = {
  id: string;
  action: string;
  target: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type Props = {
  me: Me;
  onMessage: (msg: string | null) => void;
};

const EXTRACT_EXAMPLE = `[
  {"path":"prices.89999959.amount","value":325,"confidence":0.9},
  {"path":"coverage.10101012.action","value":"exclude","confidence":0.7},
  {"path":"prices.89999959.effectiveAt","value":"2024-08-01","confidence":0.9}
]`;

const BATCH_EXAMPLE = `[
  {"contractId":"REPLACE","code":"89999959","attendanceAt":"2024-08-02","informedAmount":325},
  {"contractId":"REPLACE","code":"10101012","attendanceAt":"2024-07-09"}
]`;

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function valueToEditString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

function parseEditedValue(raw: string, original: unknown): unknown {
  const trimmed = raw.trim();
  if (typeof original === 'number') {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) throw new Error('Número inválido');
    return n;
  }
  if (typeof original === 'boolean') {
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    throw new Error('Boolean inválido');
  }
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return JSON.parse(trimmed) as unknown;
  }
  return trimmed;
}

export function DossierPage({ me, onMessage }: Props) {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [priceCode, setPriceCode] = useState('89999959');
  const [priceAt, setPriceAt] = useState('2024-08-02');
  const [priceResult, setPriceResult] = useState<PriceResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState('contrato');
  const [docTitle, setDocTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [extractDocId, setExtractDocId] = useState('');
  const [extractJson, setExtractJson] = useState(EXTRACT_EXAMPLE);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [simCode, setSimCode] = useState('89999959');
  const [simAt, setSimAt] = useState('2024-08-02');
  const [simInformed, setSimInformed] = useState('');
  const [simResult, setSimResult] = useState<SimulationRow | null>(null);
  const [simulations, setSimulations] = useState<SimulationRow[]>([]);
  const [batchJson, setBatchJson] = useState('');
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [dueEdits, setDueEdits] = useState<Record<string, string>>({});

  const canWriteDossier = hasPermission(me, 'dossier:write');
  const canReview = hasPermission(me, 'dossier:review');
  const canExport = hasPermission(me, 'dossier:export');
  const canRunSim =
    hasPermission(me, 'simulation:run') || hasPermission(me, 'simulation:read');
  const canSimulate = hasPermission(me, 'simulation:run');
  const canReadAudit = hasPermission(me, 'audit:read');
  const canReadCompliance = hasPermission(me, 'compliance:read');
  const canWriteCompliance = hasPermission(me, 'compliance:write');

  const loadContracts = useCallback(async () => {
    const res = await api<ContractRow[]>('/contracts');
    if (res.ok && res.data) setContracts(res.data);
  }, []);

  const loadDocuments = useCallback(async (id: string) => {
    const res = await api<ContractDocument[]>(`/contracts/${id}/documents`);
    if (res.ok && res.data) {
      setDocuments(res.data);
      setExtractDocId((prev) => {
        if (prev && res.data!.some((d) => d.id === prev)) return prev;
        return res.data![0]?.id ?? '';
      });
    } else {
      setDocuments([]);
      setExtractDocId('');
    }
  }, []);

  const loadReviewQueue = useCallback(
    async (contractId: string) => {
      if (!hasPermission(me, 'dossier:review')) {
        setReviewItems([]);
        return;
      }
      const res = await api<{ items: ReviewItem[] }>(
        `/review-queue?contractId=${encodeURIComponent(contractId)}`,
      );
      if (res.ok && res.data) {
        setReviewItems(res.data.items);
        const next: Record<string, string> = {};
        for (const item of res.data.items) {
          next[item.id] = valueToEditString(item.valueJson);
        }
        setEditValues(next);
      } else {
        setReviewItems([]);
      }
    },
    [me],
  );

  const loadSimulations = useCallback(
    async (contractId: string) => {
      if (
        !hasPermission(me, 'simulation:read') &&
        !hasPermission(me, 'simulation:run')
      ) {
        setSimulations([]);
        return;
      }
      const res = await api<{ items: SimulationRow[] }>(
        `/simulations?contractId=${encodeURIComponent(contractId)}&limit=15`,
      );
      if (res.ok && res.data) setSimulations(res.data.items);
      else setSimulations([]);
    },
    [me],
  );

  const loadAudit = useCallback(
    async (contractId: string) => {
      if (!hasPermission(me, 'audit:read')) {
        setAuditItems([]);
        return;
      }
      const res = await api<{ items: AuditItem[] }>(
        `/audit-trail?contractId=${encodeURIComponent(contractId)}&limit=40`,
      );
      if (res.ok && res.data) setAuditItems(res.data.items);
      else setAuditItems([]);
    },
    [me],
  );

  const loadCompliance = useCallback(
    async (contractId: string) => {
      if (!hasPermission(me, 'compliance:read')) {
        setComplianceItems([]);
        return;
      }
      const res = await api<{ items: ComplianceItem[] }>(
        `/compliance/${encodeURIComponent(contractId)}`,
      );
      if (res.ok && res.data) {
        setComplianceItems(res.data.items);
        const next: Record<string, string> = {};
        for (const item of res.data.items) {
          next[item.id] = item.dueAt
            ? item.dueAt.slice(0, 10)
            : '';
        }
        setDueEdits(next);
      } else {
        setComplianceItems([]);
      }
    },
    [me],
  );

  useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  async function seedGolden() {
    setBusy(true);
    onMessage(null);
    const res = await api<{ contractId: string; reused?: boolean }>(
      '/contracts/seed/golden-oncoradium',
      { method: 'POST' },
    );
    setBusy(false);
    if (!res.ok) {
      onMessage('Não foi possível carregar o caso golden');
      return;
    }
    onMessage(
      res.data?.reused
        ? 'Caso Unimed–Oncoradium já estava carregado'
        : 'Caso Unimed–Oncoradium carregado',
    );
    await loadContracts();
    if (res.data?.contractId) {
      await openContract(res.data.contractId);
    }
  }

  async function seedUnimedPdfs() {
    setBusy(true);
    onMessage(null);
    const res = await api<{
      contractId: string;
      imported: number;
      reused: number;
      documents: Array<{ checksum: string; reused: boolean }>;
    }>('/contracts/seed/unimed-pdfs', { method: 'POST' });
    setBusy(false);
    if (!res.ok) {
      onMessage('Falha ao importar PDFs Unimed');
      return;
    }
    onMessage(
      `PDFs Unimed: ${res.data?.imported ?? 0} novos, ${res.data?.reused ?? 0} já existentes`,
    );
    await loadContracts();
    if (res.data?.contractId) {
      await openContract(res.data.contractId);
    }
  }

  async function openContract(id: string) {
    setSelectedId(id);
    setPriceResult(null);
    setSimResult(null);
    setBatchJson(
      BATCH_EXAMPLE.replaceAll('REPLACE', id),
    );
    const [tl] = await Promise.all([
      api<{ events: TimelineEvent[] }>(`/contracts/${id}/timeline`),
      loadDocuments(id),
      loadReviewQueue(id),
      loadSimulations(id),
      loadAudit(id),
      loadCompliance(id),
    ]);
    if (tl.ok && tl.data) setTimeline(tl.data.events);
  }

  async function refreshContractViews(id: string) {
    const [tl] = await Promise.all([
      api<{ events: TimelineEvent[] }>(`/contracts/${id}/timeline`),
      loadDocuments(id),
      loadReviewQueue(id),
      loadSimulations(id),
      loadAudit(id),
      loadCompliance(id),
    ]);
    if (tl.ok && tl.data) setTimeline(tl.data.events);
    if (priceResult) {
      const res = await api<PriceResult>(
        `/contracts/${id}/prices/${encodeURIComponent(priceCode)}?at=${priceAt}`,
      );
      if (res.ok && res.data) setPriceResult(res.data);
    }
  }

  async function queryPrice(e: FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    const res = await api<PriceResult>(
      `/contracts/${selectedId}/prices/${encodeURIComponent(priceCode)}?at=${priceAt}`,
    );
    if (!res.ok || !res.data) {
      onMessage('Consulta de preço falhou');
      return;
    }
    setPriceResult(res.data);
  }

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !file || !canWriteDossier) return;
    setBusy(true);
    onMessage(null);
    const body = new FormData();
    body.append('file', file);
    body.append('type', docType);
    if (docTitle.trim()) body.append('title', docTitle.trim());

    const res = await api<ContractDocument>(
      `/contracts/${selectedId}/documents`,
      { method: 'POST', body },
    );
    setBusy(false);
    if (!res.ok) {
      onMessage('Upload falhou');
      return;
    }
    setFile(null);
    setDocTitle('');
    onMessage(
      `Documento enviado · checksum ${shortChecksum(res.data?.checksum)}`,
    );
    await Promise.all([loadDocuments(selectedId), openContract(selectedId)]);
  }

  async function onExtractAssisted(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !extractDocId || !canWriteDossier) return;
    setBusy(true);
    onMessage(null);
    let payload: unknown;
    try {
      payload = JSON.parse(extractJson) as unknown;
    } catch {
      setBusy(false);
      onMessage('JSON de extração inválido');
      return;
    }
    const res = await api<{ fieldCount: number }>(
      `/contracts/${selectedId}/documents/${extractDocId}/extract-assisted`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
    setBusy(false);
    if (!res.ok) {
      onMessage('Extração assistida falhou');
      return;
    }
    onMessage(
      `Extração criada · ${res.data?.fieldCount ?? 0} campo(s) na fila de revisão`,
    );
    await loadReviewQueue(selectedId);
  }

  async function onAcceptField(item: ReviewItem) {
    if (!selectedId || !canReview) return;
    setBusy(true);
    onMessage(null);
    let corrected: unknown | undefined;
    try {
      const edited = editValues[item.id] ?? valueToEditString(item.valueJson);
      const parsed = parseEditedValue(edited, item.valueJson);
      if (JSON.stringify(parsed) !== JSON.stringify(item.valueJson)) {
        corrected = parsed;
      }
    } catch {
      setBusy(false);
      onMessage('Valor editado inválido');
      return;
    }
    const res = await api<{ dossierVersion?: { version: number } | null }>(
      `/extracted-fields/${item.id}/accept`,
      {
        method: 'POST',
        body: JSON.stringify(
          corrected !== undefined ? { value: corrected } : {},
        ),
      },
    );
    setBusy(false);
    if (!res.ok) {
      onMessage('Aceite falhou');
      return;
    }
    onMessage(
      res.data?.dossierVersion
        ? `Campo aceito · dossiê v${res.data.dossierVersion.version}`
        : 'Campo aceito (aguardando campos relacionados)',
    );
    await refreshContractViews(selectedId);
  }

  async function onRejectField(item: ReviewItem) {
    if (!selectedId || !canReview) return;
    setBusy(true);
    onMessage(null);
    const res = await api(`/extracted-fields/${item.id}/reject`, {
      method: 'POST',
      body: '{}',
    });
    setBusy(false);
    if (!res.ok) {
      onMessage('Rejeição falhou');
      return;
    }
    onMessage('Campo rejeitado');
    await loadReviewQueue(selectedId);
  }

  async function onAcceptHighConfidence() {
    if (!selectedId || !canReview) return;
    setBusy(true);
    onMessage(null);
    const res = await api<{ accepted: number }>(
      `/contracts/${selectedId}/extracted-fields/accept-high-confidence`,
      { method: 'POST', body: '{}' },
    );
    setBusy(false);
    if (!res.ok) {
      onMessage('Aceite em lote falhou');
      return;
    }
    onMessage(`Aceitos ${res.data?.accepted ?? 0} campo(s) de alta confiança`);
    await refreshContractViews(selectedId);
  }

  async function onSimulate(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !canSimulate) return;
    setBusy(true);
    onMessage(null);
    const body: Record<string, unknown> = {
      contractId: selectedId,
      code: simCode.trim(),
      attendanceAt: simAt,
    };
    if (simInformed.trim() !== '') {
      const n = Number(simInformed.replace(',', '.'));
      if (!Number.isFinite(n)) {
        setBusy(false);
        onMessage('Valor informado inválido');
        return;
      }
      body.informedAmount = n;
    }
    const res = await api<SimulationRow>('/simulations', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok || !res.data) {
      onMessage('Simulação falhou');
      return;
    }
    setSimResult(res.data);
    const riskLevel = res.data.risk?.level ?? res.data.riskNotes?.level;
    onMessage(
      res.data.covered
        ? `Simulação: coberto · esperado R$ ${res.data.expectedAmount?.toFixed(2) ?? '—'}${riskLevel ? ` · risco ${riskLevel}` : ''}`
        : `Simulação: código não coberto${riskLevel ? ` · risco ${riskLevel}` : ''}`,
    );
    await Promise.all([loadSimulations(selectedId), loadAudit(selectedId)]);
  }

  async function onEnsureCompliance() {
    if (!selectedId || !canWriteCompliance) return;
    setBusy(true);
    onMessage(null);
    const res = await api<{ total: number; created: number }>(
      `/compliance/ensure/${selectedId}`,
      { method: 'POST' },
    );
    setBusy(false);
    if (!res.ok) {
      onMessage('Falha ao criar checklist RN510');
      return;
    }
    onMessage(
      res.data?.created
        ? `Checklist RN510: ${res.data.created} item(ns) criados (${res.data.total} total)`
        : `Checklist RN510 já existente (${res.data?.total ?? 0} itens)`,
    );
    await loadCompliance(selectedId);
  }

  async function onSaveDueAt(itemId: string) {
    if (!selectedId || !canWriteCompliance) return;
    setBusy(true);
    onMessage(null);
    const raw = dueEdits[itemId]?.trim() ?? '';
    const body: Record<string, unknown> = {
      dueAt: raw === '' ? null : raw,
    };
    if (raw !== '') {
      const due = new Date(`${raw}T12:00:00.000Z`);
      const today = new Date();
      const startDue = Date.UTC(
        due.getUTCFullYear(),
        due.getUTCMonth(),
        due.getUTCDate(),
      );
      const startToday = Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
      );
      const days = Math.floor((startDue - startToday) / 86_400_000);
      if (days < 0) body.status = 'expired';
      else if (days <= 60) body.status = 'expiring';
      else body.status = 'ok';
    }
    const res = await api<ComplianceItem>(`/compliance/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      onMessage('Falha ao atualizar validade');
      return;
    }
    onMessage('Validade atualizada');
    await loadCompliance(selectedId);
  }

  async function onSimulateBatch(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !canSimulate) return;
    setBusy(true);
    onMessage(null);
    let payload: unknown;
    try {
      payload = JSON.parse(batchJson) as unknown;
    } catch {
      setBusy(false);
      onMessage('JSON de lote inválido');
      return;
    }
    const res = await api<{ count: number }>('/simulations/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      onMessage('Lote de simulação falhou');
      return;
    }
    onMessage(`Lote: ${res.data?.count ?? 0} simulação(ões)`);
    await Promise.all([loadSimulations(selectedId), loadAudit(selectedId)]);
  }

  function exportUrl(contractId: string): string {
    return `/contracts/${contractId}/export.json`;
  }

  function actionLabel(action: string): string {
    const map: Record<string, string> = {
      simulation_run: 'Simulação',
      field_accepted: 'Campo aceito',
      field_rejected: 'Campo rejeitado',
      document_uploaded: 'Upload de documento',
      unimed_pdf_import: 'Importação PDFs Unimed',
      login_success: 'Login',
      logout: 'Logout',
    };
    return map[action] ?? action;
  }

  function alertBadgeLabel(
    level: ComplianceItem['alertLevel'],
  ): string | null {
    if (level === 'expired') return 'Vencido';
    if (level === 7) return '7 dias';
    if (level === 30) return '30 dias';
    if (level === 60) return '60 dias';
    return null;
  }

  function riskOf(s: SimulationRow): RiskResult | null {
    return s.risk ?? s.riskNotes ?? null;
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>Contratos</h2>
          {canWriteDossier ? (
            <div className="btn-row">
              <button
                type="button"
                disabled={busy}
                onClick={() => void seedGolden()}
              >
                Carregar caso Unimed–Oncoradium
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void seedUnimedPdfs()}
              >
                Importar PDFs Unimed
              </button>
            </div>
          ) : null}
        </div>
        {contracts.length === 0 ? (
          <p className="muted">
            Nenhum contrato. Carregue o caso golden para a demo.
          </p>
        ) : (
          <ul className="contract-list">
            {contracts.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={
                    selectedId === c.id
                      ? 'contract-item active'
                      : 'contract-item'
                  }
                  onClick={() => void openContract(c.id)}
                >
                  <strong>{c.title ?? `${c.partyA} × ${c.partyB}`}</strong>
                  <span>
                    {c.partyA} · {c.partyB}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedId ? (
        <>
          <section className="panel">
            <h2>Documentos / evidência</h2>
            {canWriteDossier ? (
              <form className="upload-form" onSubmit={(e) => void onUpload(e)}>
                <label>
                  Tipo
                  <select
                    value={docType}
                    onChange={(ev) => setDocType(ev.target.value)}
                  >
                    <option value="contrato">contrato</option>
                    <option value="aditivo">aditivo</option>
                    <option value="carta">carta</option>
                    <option value="comunicado">comunicado</option>
                  </select>
                </label>
                <label>
                  Título (opcional)
                  <input
                    value={docTitle}
                    onChange={(ev) => setDocTitle(ev.target.value)}
                    placeholder="Ex.: Aditivo 3"
                  />
                </label>
                <label>
                  PDF
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(ev) =>
                      setFile(ev.target.files?.[0] ?? null)
                    }
                    required
                  />
                </label>
                <button type="submit" disabled={busy || !file}>
                  Enviar PDF
                </button>
              </form>
            ) : (
              <p className="muted">Sem permissão de escrita no dossiê.</p>
            )}
            {documents.length === 0 ? (
              <p className="muted">Nenhum documento neste contrato.</p>
            ) : (
              <ul className="doc-list">
                {documents.map((d) => (
                  <li key={d.id}>
                    <strong>{d.title}</strong>
                    <span>
                      {d.type} · sha256 {shortChecksum(d.checksum)} ·{' '}
                      {fmtDate(d.uploadedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canWriteDossier ? (
            <section className="panel">
              <h2>Extrair assistido</h2>
              <p className="muted">
                Cole campos JSON (sem LLM/OCR). Todos vão para revisão humana.
              </p>
              <form
                className="extract-form"
                onSubmit={(e) => void onExtractAssisted(e)}
              >
                <label>
                  Documento
                  <select
                    value={extractDocId}
                    onChange={(ev) => setExtractDocId(ev.target.value)}
                    required
                  >
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  JSON de campos
                  <textarea
                    value={extractJson}
                    onChange={(ev) => setExtractJson(ev.target.value)}
                    rows={8}
                    spellCheck={false}
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || !extractDocId || documents.length === 0}
                >
                  Extrair assistido
                </button>
              </form>
            </section>
          ) : null}

          {canReview ? (
            <section className="panel">
              <div className="panel-head">
                <h2>Fila de revisão</h2>
                <button
                  type="button"
                  disabled={busy || reviewItems.length === 0}
                  onClick={() => void onAcceptHighConfidence()}
                >
                  Aceitar alta confiança
                </button>
              </div>
              {reviewItems.length === 0 ? (
                <p className="muted">Nenhum campo pendente neste contrato.</p>
              ) : (
                <ul className="review-list">
                  {reviewItems.map((item) => (
                    <li key={item.id} className="review-row">
                      <div>
                        <strong>{item.path}</strong>
                        <span>
                          {item.documentTitle} · confiança{' '}
                          {(item.confidence * 100).toFixed(0)}%
                        </span>
                        <label>
                          Valor
                          <input
                            value={editValues[item.id] ?? ''}
                            onChange={(ev) =>
                              setEditValues((prev) => ({
                                ...prev,
                                [item.id]: ev.target.value,
                              }))
                            }
                          />
                        </label>
                      </div>
                      <div className="user-actions">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onAcceptField(item)}
                        >
                          Aceitar
                        </button>
                        <button
                          type="button"
                          className="danger"
                          disabled={busy}
                          onClick={() => void onRejectField(item)}
                        >
                          Rejeitar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <section className="panel">
            <div className="panel-head">
              <h2>Linha do tempo</h2>
              {canExport ? (
                <a
                  className="linkish"
                  href={exportUrl(selectedId)}
                  download={`contrato-${selectedId}-export.json`}
                >
                  Baixar export.json
                </a>
              ) : null}
            </div>
            <ol className="timeline">
              {timeline.map((ev) => (
                <li key={ev.documentId}>
                  <div className="tl-meta">
                    <span className="tl-type">{ev.type}</span>
                    <span>
                      Vigência {fmtDate(ev.dates?.effectiveAt)} · Evento{' '}
                      {fmtDate(ev.dates?.eventAt)} · Assinatura{' '}
                      {fmtDate(ev.dates?.signedAt)}
                    </span>
                  </div>
                  <p className="tl-title">{ev.title}</p>
                  {ev.causalLinks.length > 0 ? (
                    <p className="tl-causal">
                      Vínculo causal:{' '}
                      {ev.causalLinks
                        .map(
                          (l) =>
                            `${l.relation} (${l.direction === 'from' ? 'origina' : 'recebe'})`,
                        )
                        .join(', ')}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <section className="panel">
            <h2>Consulta de preço vigente</h2>
            <form className="price-form" onSubmit={(e) => void queryPrice(e)}>
              <label>
                Código
                <input
                  value={priceCode}
                  onChange={(ev) => setPriceCode(ev.target.value)}
                  required
                />
              </label>
              <label>
                Data (AAAA-MM-DD)
                <input
                  type="date"
                  value={priceAt}
                  onChange={(ev) => setPriceAt(ev.target.value)}
                  required
                />
              </label>
              <button type="submit">Consultar</button>
            </form>
            <p className="hint">
              Exemplos: <code>10101012</code> em 2024-07-09 → não coberto;{' '}
              <code>89999959</code> em 2024-08-02 → R$ 325.
            </p>
            {priceResult ? (
              <div className="price-result">
                <p>
                  Código <strong>{priceResult.code}</strong> em{' '}
                  {fmtDate(priceResult.at)}:{' '}
                  {priceResult.covered ? 'coberto' : 'não coberto'}
                  {priceResult.amount != null
                    ? ` · ${priceResult.currency} ${priceResult.amount.toFixed(2)}`
                    : ''}
                </p>
                {priceResult.warnings?.length ? (
                  <ul>
                    {priceResult.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>

          {canRunSim ? (
            <section className="panel">
              <h2>Simular guia</h2>
              <p className="muted">
                UC-01: valor esperado + alertas, com evidência arquivada.
              </p>
              {canSimulate ? (
                <>
                  <form
                    className="price-form"
                    onSubmit={(e) => void onSimulate(e)}
                  >
                    <label>
                      Código
                      <input
                        value={simCode}
                        onChange={(ev) => setSimCode(ev.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Data do atendimento
                      <input
                        type="date"
                        value={simAt}
                        onChange={(ev) => setSimAt(ev.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Valor informado (opcional)
                      <input
                        value={simInformed}
                        onChange={(ev) => setSimInformed(ev.target.value)}
                        placeholder="ex.: 325"
                        inputMode="decimal"
                      />
                    </label>
                    <button type="submit" disabled={busy}>
                      Simular
                    </button>
                  </form>
                  <form
                    className="extract-form"
                    onSubmit={(e) => void onSimulateBatch(e)}
                  >
                    <label className="full">
                      Lote (JSON array)
                      <textarea
                        value={batchJson}
                        onChange={(ev) => setBatchJson(ev.target.value)}
                        rows={5}
                        spellCheck={false}
                      />
                    </label>
                    <button type="submit" disabled={busy}>
                      Simular lote
                    </button>
                  </form>
                </>
              ) : (
                <p className="muted">Sem permissão para executar simulações.</p>
              )}
              {simResult ? (
                <div className="price-result">
                  <p>
                    Última: <strong>{simResult.code}</strong> ·{' '}
                    {simResult.covered ? 'coberto' : 'não coberto'}
                    {simResult.expectedAmount != null
                      ? ` · esperado R$ ${simResult.expectedAmount.toFixed(2)}`
                      : ''}
                    {simResult.informedAmount != null
                      ? ` · informado R$ ${simResult.informedAmount.toFixed(2)}`
                      : ''}
                  </p>
                  {riskOf(simResult) ? (
                    <p className="risk-line">
                      <span
                        className={`badge badge--risk-${riskOf(simResult)!.level}`}
                      >
                        Risco {riskOf(simResult)!.level} (
                        {riskOf(simResult)!.score})
                      </span>
                    </p>
                  ) : null}
                  {riskOf(simResult)?.reasons?.length ? (
                    <ul>
                      {riskOf(simResult)!.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                  {Array.isArray(simResult.alerts) &&
                  simResult.alerts.length > 0 ? (
                    <ul>
                      {simResult.alerts.map((a, i) => (
                        <li key={`${a.type}-${i}`}>
                          <strong>{a.type}</strong>: {a.message}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Sem alertas de simulação.</p>
                  )}
                </div>
              ) : null}
              <h3 className="subhead">Simulações recentes</h3>
              {simulations.length === 0 ? (
                <p className="muted">Nenhuma simulação neste contrato.</p>
              ) : (
                <ul className="doc-list">
                  {simulations.map((s) => (
                    <li key={s.id}>
                      <strong>
                        {s.code} · {s.covered ? 'coberto' : 'não coberto'}
                        {riskOf(s)
                          ? ` · risco ${riskOf(s)!.level}`
                          : ''}
                      </strong>
                      <span>
                        {fmtDate(s.attendanceAt)} · esperado{' '}
                        {s.expectedAmount != null
                          ? `R$ ${s.expectedAmount.toFixed(2)}`
                          : '—'}
                        {Array.isArray(s.alerts) && s.alerts.length > 0
                          ? ` · ${s.alerts.length} alerta(s)`
                          : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {canReadCompliance ? (
            <section className="panel">
              <h2>Compliance RN510</h2>
              <p className="muted">
                Checklist cadastral inspirado na RN 510 — alertas 60/30/7 dias.
              </p>
              {canWriteCompliance ? (
                <p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onEnsureCompliance()}
                  >
                    Garantir checklist padrão
                  </button>
                </p>
              ) : null}
              {complianceItems.length === 0 ? (
                <p className="muted">
                  Nenhum item ainda. Use &quot;Garantir checklist padrão&quot;
                  para criar os documentos cadastrais.
                </p>
              ) : (
                <ul className="doc-list compliance-list">
                  {complianceItems.map((item) => {
                    const badge = alertBadgeLabel(item.alertLevel);
                    return (
                      <li key={item.id}>
                        <div className="compliance-row">
                          <strong>{item.title}</strong>
                          <span className="badge-row">
                            <span className="badge">{item.status}</span>
                            {badge ? (
                              <span
                                className={`badge badge--alert-${item.alertLevel === 'expired' ? 'expired' : item.alertLevel}`}
                              >
                                {badge}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <span className="muted tight">
                          {item.code} · {item.requiredBy}
                        </span>
                        {canWriteCompliance ? (
                          <div className="compliance-due">
                            <label>
                              Validade
                              <input
                                type="date"
                                value={dueEdits[item.id] ?? ''}
                                onChange={(ev) =>
                                  setDueEdits((prev) => ({
                                    ...prev,
                                    [item.id]: ev.target.value,
                                  }))
                                }
                              />
                            </label>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onSaveDueAt(item.id)}
                            >
                              Salvar
                            </button>
                          </div>
                        ) : (
                          <span>
                            Validade: {fmtDate(item.dueAt)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          {canReadAudit ? (
            <section className="panel">
              <h2>Auditoria</h2>
              <p className="muted">
                Eventos do contrato (simulações, revisões, uploads).
              </p>
              {auditItems.length === 0 ? (
                <p className="muted">Nenhum evento de auditoria ainda.</p>
              ) : (
                <ul className="doc-list">
                  {auditItems.map((ev) => (
                    <li key={ev.id}>
                      <strong>{actionLabel(ev.action)}</strong>
                      <span>
                        {ev.actorEmail ?? 'sistema'} ·{' '}
                        {new Date(ev.createdAt).toLocaleString('pt-BR')}
                        {ev.metadata &&
                        typeof ev.metadata === 'object' &&
                        'path' in ev.metadata
                          ? ` · ${String(ev.metadata.path)}`
                          : ''}
                        {ev.metadata &&
                        typeof ev.metadata === 'object' &&
                        'code' in ev.metadata
                          ? ` · cód. ${String(ev.metadata.code)}`
                          : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
