import { computeAlertLevel } from './alert-level';

describe('computeAlertLevel', () => {
  const today = new Date('2026-09-09T15:00:00.000Z');

  it('returns null without dueAt', () => {
    expect(computeAlertLevel(null, today)).toBeNull();
    expect(computeAlertLevel(undefined, today)).toBeNull();
  });

  it('returns expired when dueAt is before today', () => {
    expect(computeAlertLevel(new Date('2026-09-08T12:00:00.000Z'), today)).toBe(
      'expired',
    );
  });

  it('returns 7 when due within 7 days', () => {
    expect(computeAlertLevel(new Date('2026-09-09T12:00:00.000Z'), today)).toBe(
      7,
    );
    expect(computeAlertLevel(new Date('2026-09-16T12:00:00.000Z'), today)).toBe(
      7,
    );
  });

  it('returns 30 when due within 8–30 days', () => {
    expect(computeAlertLevel(new Date('2026-09-17T12:00:00.000Z'), today)).toBe(
      30,
    );
    expect(computeAlertLevel(new Date('2026-10-09T12:00:00.000Z'), today)).toBe(
      30,
    );
  });

  it('returns 60 when due within 31–60 days', () => {
    expect(computeAlertLevel(new Date('2026-10-10T12:00:00.000Z'), today)).toBe(
      60,
    );
    expect(computeAlertLevel(new Date('2026-11-08T12:00:00.000Z'), today)).toBe(
      60,
    );
  });

  it('returns null when more than 60 days away', () => {
    expect(computeAlertLevel(new Date('2026-11-09T12:00:00.000Z'), today)).toBeNull();
  });
});
