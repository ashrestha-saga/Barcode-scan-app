import { EXPIRY_WARN_DAYS } from "@/constants/expiry";
import type { ExpiryLevel } from "@/interfaces/domain";

export function expiryLevel(
  exp: Date,
  now = new Date(),
  warnDays = EXPIRY_WARN_DAYS,
): ExpiryLevel {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (diffDays < 0) return "bad";
  if (diffDays < warnDays) return "warn";
  return "ok";
}
