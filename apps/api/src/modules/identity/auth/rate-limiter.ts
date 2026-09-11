/**
 * Simple in-memory rate limiter for PoC.
 * Production: prefer reverse-proxy (nginx) or Redis — see docs/CONFIGURACOES-AUTORIZACAO.md.
 */
type Bucket = { count: number; resetAt: number };

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
  ) {}

  /** @returns true if allowed */
  check(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (bucket.count >= this.max) {
      return false;
    }
    bucket.count += 1;
    return true;
  }
}

export function createAuthRateLimiter(): InMemoryRateLimiter {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000);
  const max = Number(process.env.RATE_LIMIT_AUTH_MAX ?? 20);
  return new InMemoryRateLimiter(windowMs, max);
}
