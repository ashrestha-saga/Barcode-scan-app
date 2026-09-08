export function eur(n: number): string {
  return (
    n.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

export function eurUnit(n: number): string {
  return (
    n.toLocaleString("de-DE", {
      minimumFractionDigits: n < 1 ? 3 : 2,
      maximumFractionDigits: n < 1 ? 3 : 2,
    }) + " €"
  );
}

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
