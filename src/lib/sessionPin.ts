/** Session PIN: 3–11 numeric digits. */
export const SESSION_PIN_MIN = 3;
export const SESSION_PIN_MAX = 11;
export const SESSION_PIN_PATTERN = /^\d{3,11}$/;

export function sanitizeSessionPinInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, SESSION_PIN_MAX);
}

export function isValidSessionPin(pin: string): boolean {
  return SESSION_PIN_PATTERN.test(pin);
}

/** Active children on a parent profile require a session PIN. */
export function profileRequiresSessionPin(profile: {
  childs?: Array<{ active?: boolean } | null | undefined> | null;
}): boolean {
  const childs = profile.childs?.filter(Boolean) ?? [];
  if (!childs.length) return false;
  return childs.some((c) => c?.active !== false);
}
