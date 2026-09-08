import { stripGs1Envelope, findAi, parseGS1 } from "@/lib/gs1";
import type { ArticleLookupKey } from "@/interfaces/article";

/** Normalize a scan to digits (plain EAN or GS1 AI 01). */
export function normalizeScannedCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const ais = parseGS1(stripGs1Envelope(trimmed));
  const fromAi = findAi(ais, "01");
  const digits = (fromAi ?? trimmed).replace(/\D/g, "");
  if (digits.length === 14 && digits.startsWith("0")) return digits.slice(1);
  return digits || trimmed;
}

/**
 * Value to send for a shop lookup key.
 * Barcode / EAN / GTIN: normalized digits from the scan.
 * Article number and other text keys: trimmed raw input.
 */
export function lookupValueForKey(
  raw: string,
  key: ArticleLookupKey,
): string {
  const trimmed = raw.trim().replace(/\s+/g, "");
  if (!trimmed) return "";
  if (key === "oxean" || key === "gtin" || key === "oxdistean") {
    return normalizeScannedCode(trimmed) || trimmed;
  }
  return trimmed;
}
