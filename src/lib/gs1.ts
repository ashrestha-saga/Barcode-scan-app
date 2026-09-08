import type { Gs1Ai, LotInfo } from "@/interfaces/domain";

const GS = "\u001D";

const SYMBOLOGY_PREFIX = /^(\]C1|\]d2|\]e0|\]E0|\]Q3|\]Q0|\]x0)/i;

const AI_FIX: Record<string, number> = {
  "01": 14,
  "11": 6,
  "15": 6,
  "17": 6,
};

const AI_VAR: Record<string, number> = {
  "10": 20,
  "21": 20,
  "30": 8,
};

const AI_META: Record<string, { n: string; part: "DI" | "PI" }> = {
  "01": { n: "GTIN", part: "DI" },
  "11": { n: "Produktionsdatum", part: "PI" },
  "15": { n: "Mindesthaltbarkeit", part: "PI" },
  "17": { n: "Verfallsdatum", part: "PI" },
  "10": { n: "Charge (LOT)", part: "PI" },
  "21": { n: "Seriennummer", part: "PI" },
  "30": { n: "Menge", part: "PI" },
};

export function stripGs1Envelope(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^\u00E8/, "");
  s = s.replace(SYMBOLOGY_PREFIX, "");
  if (s.startsWith(GS)) s = s.slice(1);
  return s;
}

function isKnownAi(ai: string): boolean {
  return Boolean(AI_FIX[ai] || AI_VAR[ai]);
}

/** AI 01 is spec-14. Scanners often omit the GTIN-14 leading zero. */
function readAi01(raw: string, start: number): { val: string; next: number } {
  const fourteen = raw.slice(start, start + 14);
  const after14 = raw.slice(start + 14, start + 16);
  const thirteen = raw.slice(start, start + 13);
  const after13 = raw.slice(start + 13, start + 15);
  const fourteenOk =
    fourteen.length === 14 &&
    (start + 14 >= raw.length || isKnownAi(after14) || after14.startsWith(GS));
  const thirteenOk = thirteen.length === 13 && isKnownAi(after13);

  if (fourteenOk || !thirteenOk) {
    return { val: normalizeAi01(fourteen), next: start + fourteen.length };
  }
  return { val: normalizeAi01(thirteen), next: start + 13 };
}

function metaFor(ai: string): { n: string; part: "DI" | "PI" } {
  return AI_META[ai] ?? { n: "—", part: "PI" };
}

function normalizeAi01(val: string): string {
  const digits = val.replace(/\D/g, "");
  if (digits.length === 13) return `0${digits}`;
  return digits || val;
}

function parseParenthesized(raw: string): Gs1Ai[] {
  const out: Gs1Ai[] = [];
  const re = /\((\d{2,4})\)([^()]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const ai = m[1];
    if (ai.length !== 2 || (!AI_FIX[ai] && !AI_VAR[ai])) continue;
    let val = m[2].trim();
    if (ai === "01") val = normalizeAi01(val);
    out.push({ ai, val, name: metaFor(ai).n, part: metaFor(ai).part });
  }
  return out;
}

function parseElementString(raw: string): Gs1Ai[] {
  const out: Gs1Ai[] = [];
  let i = 0;
  let guard = 0;

  while (i < raw.length && guard++ < 24) {
    if (raw[i] === GS) {
      i++;
      continue;
    }
    const ai = raw.slice(i, i + 2);
    if (!AI_FIX[ai] && !AI_VAR[ai]) return out;
    i += 2;

    let val: string;
    if (ai === "01") {
      const read = readAi01(raw, i);
      val = read.val;
      i = read.next;
    } else if (AI_FIX[ai]) {
      val = raw.slice(i, i + AI_FIX[ai]);
      i += AI_FIX[ai];
    } else {
      let end = raw.indexOf(GS, i);
      if (end === -1) end = Math.min(raw.length, i + AI_VAR[ai]);
      val = raw.slice(i, end);
      i = end;
    }

    const meta = metaFor(ai);
    out.push({ ai, val, name: meta.n, part: meta.part });
  }

  return out;
}

/** Parse supported GS1 Application Identifiers from a raw UDI/payload. */
export function parseGS1(raw: string): Gs1Ai[] {
  const stripped = stripGs1Envelope(raw);
  if (/\(\d{2,4}\)/.test(stripped)) {
    const paren = parseParenthesized(stripped);
    if (paren.length) return paren;
  }
  return parseElementString(stripped);
}

/** True when the payload carries a GS1 DI (AI 01) plus at least one PI. */
export function isGs1Udi(raw: string): boolean {
  const ais = parseGS1(raw);
  return Boolean(findAi(ais, "01") && hasProductionIdentifier(ais));
}

function hasProductionIdentifier(ais: Gs1Ai[]): boolean {
  return Boolean(
    findAi(ais, "10") ||
      findAi(ais, "17") ||
      findAi(ais, "21") ||
      findAi(ais, "11") ||
      findAi(ais, "15"),
  );
}

/** Lot/expiry/serial taken from the scanned UDI, not synthesized. */
export function lotInfoFromScan(raw: string): LotInfo | null {
  const ais = parseGS1(raw);
  if (!findAi(ais, "01") || !hasProductionIdentifier(ais)) return null;
  const expRaw = findAi(ais, "17") ?? findAi(ais, "15") ?? null;
  return {
    lot: findAi(ais, "10") ?? "—",
    expiry: expRaw ? fromYYMMDD(expRaw) : null,
    serial: findAi(ais, "21") ?? null,
    raw,
    ais,
  };
}

export function yymmdd(d: Date): string {
  return (
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0")
  );
}

export function fromYYMMDD(s: string): Date {
  const yy = parseInt(s.slice(0, 2), 10);
  const mm = parseInt(s.slice(2, 4), 10);
  const dd = parseInt(s.slice(4, 6), 10);
  const year = 2000 + yy;
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || mm < 1) {
    return new Date(NaN);
  }
  if (dd === 0) return new Date(year, mm, 0);
  return new Date(year, mm - 1, dd);
}

export function formatGs1Date(val: string): string {
  const d = fromYYMMDD(val);
  return Number.isNaN(d.getTime()) ? val : deDate(d);
}

export function deDate(d: Date): string {
  return (
    String(d.getDate()).padStart(2, "0") +
    "." +
    String(d.getMonth() + 1).padStart(2, "0") +
    "." +
    d.getFullYear()
  );
}

export function rawPretty(raw: string): string {
  return raw.replaceAll(GS, "␟");
}

export function findAi(ais: Gs1Ai[], ai: string): string | undefined {
  return ais.find((x) => x.ai === ai)?.val;
}
