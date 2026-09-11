/**
 * Assisted extraction path conventions (document in code):
 * ```json
 * [
 *   {"path":"prices.89999959.amount","value":325,"confidence":0.9},
 *   {"path":"coverage.10101012.action","value":"exclude","confidence":0.7},
 *   {"path":"prices.89999959.effectiveAt","value":"2024-08-01","confidence":0.9}
 * ]
 * ```
 */

export type ParsedPath =
  | { kind: 'price'; code: string; attr: 'amount' | 'effectiveAt' }
  | { kind: 'coverage'; code: string; attr: 'action' };

const PRICE_RE = /^prices\.([^.]+)\.(amount|effectiveAt)$/;
const COVERAGE_RE = /^coverage\.([^.]+)\.(action)$/;

export function parseExtractPath(path: string): ParsedPath | null {
  const price = PRICE_RE.exec(path);
  if (price) {
    return {
      kind: 'price',
      code: price[1],
      attr: price[2] as 'amount' | 'effectiveAt',
    };
  }
  const cov = COVERAGE_RE.exec(path);
  if (cov) {
    return { kind: 'coverage', code: cov[1], attr: 'action' };
  }
  return null;
}

export function autoAcceptThreshold(): number {
  const raw = process.env.EXTRACT_AUTO_ACCEPT_THRESHOLD;
  if (raw == null || raw === '') return 0.85;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0.85;
}
