import type {
  DataTrackMode,
  OperadoraPreset,
  ProviderType,
  TenantPreset,
} from './types';
import {
  OPERADORA_PRESETS,
  PROVIDER_TYPE_PRESETS,
  TENANT_PRESETS,
} from './types';

type Props = {
  track: DataTrackMode;
  onTrackChange: (track: DataTrackMode) => void;
  tenantId: string;
  onTenantChange: (id: string) => void;
  providerType: ProviderType;
  onProviderTypeChange: (type: ProviderType) => void;
  operadoraId: string;
  onOperadoraChange: (id: string) => void;
  loading?: boolean;
};

const selectCls =
  'w-full rounded-xl border border-ray-border bg-[#0d111a] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-ray-cyan/50 focus:ring-2 focus:ring-ray-cyan/25 disabled:opacity-60';

export function TopControlBar({
  track,
  onTrackChange,
  tenantId,
  onTenantChange,
  providerType,
  onProviderTypeChange,
  operadoraId,
  onOperadoraChange,
  loading,
}: Props) {
  const tenantsForType = TENANT_PRESETS.filter(
    (t) => t.providerType === providerType,
  );

  return (
    <div className="rounded-2xl border border-ray-border bg-ray-card p-4 shadow-xl shadow-black/40">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-3 md:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Tenant
            </span>
            <select
              className={selectCls}
              value={tenantId}
              onChange={(e) => onTenantChange(e.target.value)}
              disabled={loading}
            >
              {(tenantsForType.length ? tenantsForType : TENANT_PRESETS).map(
                (t: TenantPreset) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Tipo de prestador
            </span>
            <select
              className={selectCls}
              value={providerType}
              onChange={(e) =>
                onProviderTypeChange(e.target.value as ProviderType)
              }
              disabled={loading}
            >
              {PROVIDER_TYPE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Operadora
            </span>
            <select
              className={selectCls}
              value={operadoraId}
              onChange={(e) => onOperadoraChange(e.target.value)}
              disabled={loading}
            >
              {OPERADORA_PRESETS.map((o: OperadoraPreset) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Switch moderno Base Sintética ↔ Produção */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Ambiente de dados
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={track === 'simulation'}
            disabled={loading}
            onClick={() =>
              onTrackChange(
                track === 'simulation' ? 'production' : 'simulation',
              )
            }
            className="group relative flex w-full min-w-0 max-w-full items-center rounded-full border border-ray-border bg-[#0d111a] p-1 text-left transition hover:border-ray-cyan/40 sm:min-w-[260px] xl:w-[320px]"
          >
            <span
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-ray-blue shadow-md transition-transform duration-300 ${
                track === 'simulation' ? 'left-1 translate-x-0' : 'left-1 translate-x-full'
              }`}
              aria-hidden
            />
            <span
              className={`relative z-10 flex-1 px-3 py-2 text-center text-xs font-semibold sm:text-sm ${
                track === 'simulation' ? 'text-ray-bg' : 'text-slate-400'
              }`}
            >
              Base Sintética
            </span>
            <span
              className={`relative z-10 flex-1 px-3 py-2 text-center text-xs font-semibold sm:text-sm ${
                track === 'production' ? 'text-ray-bg' : 'text-slate-400'
              }`}
            >
              Produção
            </span>
          </button>
          <p className="text-[11px] text-slate-500">
            {track === 'simulation'
              ? 'Demonstração — sem PII de produção'
              : 'Ambiente real do tenant (dossiê)'}
          </p>
        </div>
      </div>
    </div>
  );
}
