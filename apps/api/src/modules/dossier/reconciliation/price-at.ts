export type PriceLike = {
  code: string;
  amount: number;
  currency?: string;
  effectiveAt: Date;
  effectiveUntil?: Date | null;
  sourceDocumentId?: string | null;
  dossierVersionId?: string | null;
};

/**
 * Half-open vigency [effectiveAt, effectiveUntil).
 * Among matching rows, newest effectiveAt wins.
 */
export function priceAt(
  items: PriceLike[],
  code: string,
  at: Date,
): PriceLike | null {
  return (
    items
      .filter(
        (i) =>
          i.code === code &&
          i.effectiveAt.getTime() <= at.getTime() &&
          (i.effectiveUntil == null || at.getTime() < i.effectiveUntil.getTime()),
      )
      .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime())[0] ??
    null
  );
}
