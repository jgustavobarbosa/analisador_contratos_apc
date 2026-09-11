export type AlertLevel = null | 60 | 30 | 7 | 'expired';

/**
 * Computed alert based on dueAt vs today (UTC day).
 * - expired: dueAt before today
 * - 7 / 30 / 60: days remaining within that window
 * - null: no dueAt or more than 60 days away
 */
export function computeAlertLevel(
  dueAt: Date | null | undefined,
  today: Date = new Date(),
): AlertLevel {
  if (!dueAt) return null;

  const startOfToday = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const startOfDue = Date.UTC(
    dueAt.getUTCFullYear(),
    dueAt.getUTCMonth(),
    dueAt.getUTCDate(),
  );
  const days = Math.floor((startOfDue - startOfToday) / 86_400_000);

  if (days < 0) return 'expired';
  if (days <= 7) return 7;
  if (days <= 30) return 30;
  if (days <= 60) return 60;
  return null;
}
