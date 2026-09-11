/** Password policy — changes require human authorization (see docs/CONFIGURACOES-AUTORIZACAO.md). */
export const PASSWORD_MIN_LENGTH = 10;

export type PasswordPolicyResult =
  | { ok: true }
  | { ok: false; reasons: string[] };

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const reasons: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    reasons.push(`minimum length is ${PASSWORD_MIN_LENGTH}`);
  }
  if (!/[A-Za-z]/.test(password)) {
    reasons.push('must contain a letter');
  }
  if (!/[0-9]/.test(password)) {
    reasons.push('must contain a number');
  }
  if (reasons.length > 0) {
    return { ok: false, reasons };
  }
  return { ok: true };
}
