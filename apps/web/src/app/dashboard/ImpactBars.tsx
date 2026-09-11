import { shapToExecutiveLabel } from './kpis';

export type ShapFeature = {
  feature: string;
  shapValue: number;
  direction: string;
};

type Props = {
  features: ShapFeature[];
  maxItems?: number;
};

/**
 * Barras de impacto executivas (substitui listagem crua de SHAP).
 * Verde = reduz risco · Vermelho = eleva risco de glosa.
 */
export function ImpactBars({ features, maxItems = 3 }: Props) {
  const items = [...features]
    .sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue))
    .slice(0, maxItems);

  const maxAbs = Math.max(...items.map((f) => Math.abs(f.shapValue)), 0.01);

  return (
    <ul className="mt-3 space-y-2.5">
      {items.map((f) => {
        const raises =
          f.direction.includes('increases') || f.shapValue > 0;
        const pct = Math.min(100, (Math.abs(f.shapValue) / maxAbs) * 100);
        return (
          <li key={f.feature}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-sm leading-snug text-slate-200">
                {shapToExecutiveLabel(f.feature)}
              </p>
              <span
                className={`shrink-0 text-xs font-semibold ${
                  raises ? 'text-ray-alert' : 'text-ray-neon'
                }`}
              >
                {raises ? 'Eleva risco' : 'Reduz risco'}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ray-border/80">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  raises
                    ? 'bg-gradient-to-r from-ray-alert/70 to-ray-alert'
                    : 'bg-gradient-to-r from-ray-neon/70 to-ray-neon'
                }`}
                style={{ width: `${pct}%` }}
                title={`${f.feature}: ${f.shapValue.toFixed(3)}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
