import {
  PASSWORD_MIN_LENGTH,
  validatePasswordPolicy,
} from './password-policy';

describe('validatePasswordPolicy', () => {
  it('rejects short passwords', () => {
    const result = validatePasswordPolicy('Ab1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.reasons.some((r: string) =>
          r.includes(String(PASSWORD_MIN_LENGTH)),
        ),
      ).toBe(true);
    }
  });

  it('rejects passwords without letters or numbers', () => {
    expect(validatePasswordPolicy('12345678901').ok).toBe(false);
    expect(validatePasswordPolicy('abcdefghijk').ok).toBe(false);
  });

  it('accepts a compliant password', () => {
    expect(validatePasswordPolicy('SecurePass1').ok).toBe(true);
  });
});
