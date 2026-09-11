/**
 * Marca oficial RAY.IA — nunca distorcer (object-contain + aspect-ratio intrínseco).
 * Asset nativo: 401×135 (logo dark) / 401×134 (positive).
 */

const ASSETS = {
  dark: { src: '/brand/rayia-logo-dark.png', w: 401, h: 135 },
  positive: { src: '/brand/rayia-logo-positive.png', w: 401, h: 134 },
} as const;

type Props = {
  variant?: keyof typeof ASSETS;
  className?: string;
  /** Altura visual em px; a largura segue a proporção do PNG. */
  height?: number;
};

export function BrandLogo({
  variant = 'dark',
  className = '',
  height = 28,
}: Props) {
  const asset = ASSETS[variant];
  const width = Math.round((height * asset.w) / asset.h);

  return (
    <img
      src={asset.src}
      alt="Ray IA"
      width={asset.w}
      height={asset.h}
      decoding="async"
      draggable={false}
      className={`block shrink-0 select-none object-contain object-left ${className}`}
      style={{
        height: `${height}px`,
        width: `${width}px`,
        maxWidth: `${width}px`,
        maxHeight: `${height}px`,
        aspectRatio: `${asset.w} / ${asset.h}`,
        objectFit: 'contain',
      }}
    />
  );
}

/** Wordmark CSS (fallback sem distorção) — Ray branco + IA em gradiente. */
export function BrandWordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline gap-0 font-display text-[1.35rem] font-bold tracking-tight ${className}`}
      aria-label="Ray IA"
    >
      <span className="text-white">Ray</span>
      <span className="bg-ray-gradient bg-clip-text text-transparent">IA</span>
    </span>
  );
}
