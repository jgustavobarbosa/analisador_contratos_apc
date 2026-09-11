import { wouldRemoveLastAdmin } from './last-admin.guard';

describe('wouldRemoveLastAdmin', () => {
  it('blocks disabling the sole active admin', () => {
    expect(
      wouldRemoveLastAdmin({
        targetIsAdmin: true,
        targetIsActive: true,
        activeAdminCount: 1,
        action: 'disable',
      }),
    ).toBe(true);
  });

  it('allows disabling when another admin exists', () => {
    expect(
      wouldRemoveLastAdmin({
        targetIsAdmin: true,
        targetIsActive: true,
        activeAdminCount: 2,
        action: 'disable',
      }),
    ).toBe(false);
  });

  it('ignores non-admin targets', () => {
    expect(
      wouldRemoveLastAdmin({
        targetIsAdmin: false,
        targetIsActive: true,
        activeAdminCount: 1,
        action: 'disable',
      }),
    ).toBe(false);
  });
});
