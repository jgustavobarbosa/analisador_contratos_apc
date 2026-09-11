import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, hasPermission, type Me } from '../../api';

type Dimension = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

type InstrumentRow = {
  id: string;
  code: string;
  title: string;
  sourceKind: string;
  sourceUrl: string | null;
  localPath: string | null;
  publisher: string | null;
  summary: string | null;
  tags: string[];
  dimensions: Array<{
    notes: string | null;
    dimension: { code: string; name: string };
  }>;
};

type Props = {
  me: Me;
  onMessage: (msg: string | null) => void;
};

export function CatalogPage({ me, onMessage }: Props) {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [instruments, setInstruments] = useState<InstrumentRow[]>([]);
  const [dimensionFilter, setDimensionFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [busy, setBusy] = useState(false);

  const canRead = hasPermission(me, 'catalog:read');

  const load = useCallback(async () => {
    if (!canRead) return;
    setBusy(true);
    onMessage(null);
    const qs = new URLSearchParams();
    if (dimensionFilter) qs.set('dimension', dimensionFilter);
    if (sourceFilter) qs.set('sourceKind', sourceFilter);
    const q = qs.toString() ? `?${qs.toString()}` : '';

    const [dims, inst] = await Promise.all([
      api<Dimension[]>('/catalog/dimensions'),
      api<InstrumentRow[]>(`/catalog/instruments${q}`),
    ]);
    setBusy(false);

    if (!dims.ok || !inst.ok) {
      onMessage('Não foi possível carregar o catálogo');
      return;
    }
    setDimensions(dims.data ?? []);
    setInstruments(inst.data ?? []);
  }, [canRead, dimensionFilter, sourceFilter, onMessage]);

  useEffect(() => {
    void load();
  }, [load]);

  const sourceKinds = useMemo(() => {
    const set = new Set(instruments.map((i) => i.sourceKind));
    // keep known filters even if current list is filtered
    for (const k of [
      'ans',
      'cfm',
      'associacao',
      'jusbrasil',
      'hospital',
      'caso_base',
      'outro',
    ]) {
      set.add(k);
    }
    return [...set].sort();
  }, [instruments]);

  if (!canRead) {
    return (
      <section className="panel">
        <p className="muted">Sem permissão catalog:read.</p>
      </section>
    );
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>Dimensões de controle</h2>
          <button type="button" disabled={busy} onClick={() => void load()}>
            Atualizar
          </button>
        </div>
        <ul className="dim-list">
          {dimensions.map((d) => (
            <li key={d.code}>
              <button
                type="button"
                className={
                  dimensionFilter === d.code
                    ? 'dim-chip active'
                    : 'dim-chip'
                }
                onClick={() =>
                  setDimensionFilter((prev) =>
                    prev === d.code ? '' : d.code,
                  )
                }
              >
                <strong>{d.name}</strong>
                <span>{d.code}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="hint">
          Clique numa dimensão para filtrar instrumentos. Corpus primário =
          PDFs Unimed–Oncoradium (`caso_base`); externos = URL de referência.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Instrumentos</h2>
          <label className="inline-filter">
            Origem
            <select
              value={sourceFilter}
              onChange={(ev) => setSourceFilter(ev.target.value)}
            >
              <option value="">todas</option>
              {sourceKinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
        </div>
        {instruments.length === 0 ? (
          <p className="muted">
            Nenhum instrumento. Rode o seed da API ou importe PDFs Unimed no
            Dossiê.
          </p>
        ) : (
          <ul className="instrument-list">
            {instruments.map((inst) => (
              <li key={inst.code} className="instrument-item">
                <div className="instrument-head">
                  <strong>{inst.title}</strong>
                  <span className="badge-row">
                    <span className="badge">{inst.sourceKind}</span>
                    {inst.sourceKind === 'caso_base' ? (
                      <span className="badge badge--local">local</span>
                    ) : null}
                  </span>
                </div>
                {inst.publisher ? (
                  <p className="muted tight">{inst.publisher}</p>
                ) : null}
                {inst.summary ? (
                  <p className="instrument-summary">{inst.summary}</p>
                ) : null}
                <p className="dim-tags">
                  {inst.dimensions
                    .map((d) => d.dimension.code)
                    .join(' · ') || '—'}
                </p>
                {inst.sourceUrl ? (
                  <a
                    href={inst.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="ext-link"
                  >
                    Abrir fonte
                  </a>
                ) : inst.localPath ? (
                  <span className="muted">Path: {inst.localPath}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
