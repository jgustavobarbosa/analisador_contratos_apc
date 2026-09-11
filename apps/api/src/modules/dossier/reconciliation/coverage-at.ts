export type CoverageLike = {
  code: string;
  action: 'include' | 'exclude';
  effectiveAt: Date;
  sourceDocumentId?: string | null;
  dossierVersionId?: string | null;
};

/**
 * Last coverage action for `code` with effectiveAt <= at.
 * Missing history → not covered.
 */
export function coverageAt(
  items: CoverageLike[],
  code: string,
  at: Date,
): { covered: boolean; item: CoverageLike | null } {
  const item =
    items
      .filter(
        (i) => i.code === code && i.effectiveAt.getTime() <= at.getTime(),
      )
      .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime())[0] ??
    null;

  if (!item) {
    return { covered: false, item: null };
  }
  return { covered: item.action === 'include', item };
}
