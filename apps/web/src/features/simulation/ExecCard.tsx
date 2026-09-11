import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';

export function ExecCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`flex min-h-0 flex-col rounded-xl border border-ray-border bg-ray-card p-3 transition-colors duration-200 hover:border-ray-blue/40 sm:min-h-[280px] sm:p-4 ${className}`}
    >
      {children}
    </article>
  );
}

export function ExecCardHeader({
  icon: Icon,
  title,
  pulse,
  pulseLabel,
}: {
  icon: LucideIcon;
  title: string;
  pulse?: 'live' | 'warn' | 'ok';
  pulseLabel?: string;
}) {
  const pulseColor =
    pulse === 'warn'
      ? 'bg-ray-warning'
      : pulse === 'ok'
        ? 'bg-ray-neon'
        : 'bg-ray-cyan';

  return (
    <header className="mb-3 flex items-start justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-ray-border bg-[#0d111a] text-ray-cyan">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h3 className="m-0 text-xs font-semibold tracking-wider text-slate-400 uppercase">
          {title}
        </h3>
      </div>
      {pulseLabel ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ray-border bg-[#0d111a] px-2 py-0.5 text-[10px] font-medium text-slate-400">
          <span
            className={`h-1.5 w-1.5 animate-pulse rounded-full ${pulseColor}`}
          />
          {pulseLabel}
        </span>
      ) : null}
    </header>
  );
}

export function SegmentPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-blue-800/40 bg-blue-950/50 px-2 py-0.5 text-xs text-blue-400">
      {children}
    </span>
  );
}

export function CardFooterLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-auto pt-3 text-left text-xs font-semibold text-ray-cyan transition hover:text-white"
    >
      {children}
    </button>
  );
}

export { AlertTriangle, CheckCircle2, FileText, ShieldAlert, Sparkles };
