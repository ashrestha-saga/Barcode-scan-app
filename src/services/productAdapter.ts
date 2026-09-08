import { MOCK_PRODUCTS, UNKNOWN_CODE } from "@/constants/catalog";
import type { ArticleLookupKey } from "@/interfaces/article";
import type { ExpiryLevel, LotInfo, LotState, Product } from "@/interfaces/domain";
import { lookupValueForKey, normalizeScannedCode } from "@/lib/articleLookup";
import { expiryLevel } from "@/lib/expiry";
import { deDate, findAi, lotInfoFromScan, parseGS1, yymmdd } from "@/lib/gs1";
import { fetchArticleProducts } from "@/services/articleService";

export type { LotState };

export type ResolveResult =
  | { kind: "found"; product: Product; lot: LotInfo | null; ms: number }
  | { kind: "unknown"; code: string; ms: number };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function lotFor(product: Product, lotState: LotState): LotInfo {
  const now = new Date();
  let exp: Date;
  if (lotState === "bad") {
    exp = new Date(now);
    exp.setDate(exp.getDate() - 12);
  } else if (lotState === "warn") {
    exp = new Date(now);
    exp.setDate(exp.getDate() + 45);
  } else {
    exp = new Date(now);
    exp.setMonth(exp.getMonth() + 14);
  }

  const lot = `${product.lotPrefix ?? "LT"}-${yymmdd(now).slice(0, 4)}${String(now.getDate()).padStart(2, "0")}`;
  const serial = product.serial ?? null;
  const gtin = product.gtin.padStart(14, "0");
  let raw = `01${gtin}17${yymmdd(exp)}10${lot}`;
  if (serial) raw += `\u001D21${serial}`;

  const ais = parseGS1(raw);
  return { lot, expiry: exp, serial, raw, ais };
}

export function getProductBySku(sku: string): Product | undefined {
  return MOCK_PRODUCTS.find((p) => p.sku === sku);
}

export function lookupCode(code: string): Product | undefined {
  const normalized = code.trim();
  if (!normalized || normalized === UNKNOWN_CODE) return undefined;

  const byGtin = MOCK_PRODUCTS.find(
    (p) => p.gtin === normalized || p.gtin.padStart(14, "0") === normalized.padStart(14, "0"),
  );
  if (byGtin) return byGtin;

  const bySku = MOCK_PRODUCTS.find(
    (p) => p.sku.toLowerCase() === normalized.toLowerCase(),
  );
  if (bySku) return bySku;

  // GS1 payload containing AI(01)
  const ais = parseGS1(normalized);
  const gtin = findAi(ais, "01");
  if (gtin) {
    return MOCK_PRODUCTS.find(
      (p) => p.gtin.padStart(14, "0") === gtin.padStart(14, "0"),
    );
  }

  return undefined;
}

export async function resolveProduct(
  codeOrSku: string,
  opts: {
    online: boolean;
    lotState?: LotState;
    latencyMs?: number;
    /** Camera scan defaults to oxean; manual entry may use oxartnum. */
    lookupKey?: ArticleLookupKey;
  } = {
    online: true,
  },
): Promise<ResolveResult> {
  const started = Date.now();
  const lookupKey = opts.lookupKey ?? "oxean";
  const lookupValue = lookupValueForKey(codeOrSku, lookupKey);

  if (opts.online && lookupValue) {
    const products = await fetchArticleProducts(
      [lookupValue],
      lookupKey,
      normalizeScannedCode(codeOrSku) || undefined,
    );
    const product = products[0];
    if (product) {
      const lot = lotInfoFromScan(codeOrSku);
      return { kind: "found", product, lot, ms: Date.now() - started };
    }
    return { kind: "unknown", code: codeOrSku.trim(), ms: Date.now() - started };
  }

  const ms =
    opts.latencyMs ??
    (opts.online ? 110 + Math.floor(Math.random() * 230) : 40);
  await sleep(ms);

  const lotFromScan = lotInfoFromScan(codeOrSku);

  const bySku = getProductBySku(codeOrSku);
  if (bySku) {
    const lot = lotFromScan ?? (bySku.udi ? lotFor(bySku, opts.lotState ?? "ok") : null);
    return { kind: "found", product: bySku, lot, ms };
  }

  if (!opts.online) {
    const local = lookupCode(codeOrSku);
    if (local) {
      const lot = lotFromScan ?? (local.udi ? lotFor(local, opts.lotState ?? "ok") : null);
      return { kind: "found", product: local, lot, ms };
    }
    return { kind: "unknown", code: codeOrSku, ms };
  }

  const product = lookupCode(codeOrSku);
  if (!product) return { kind: "unknown", code: codeOrSku.trim(), ms };

  const lot =
    lotFromScan ??
    (product.udi ? lotFor(product, opts.lotState ?? "ok") : null);

  return { kind: "found", product, lot, ms };
}

export function classifyLotExpiry(lot: LotInfo | null): ExpiryLevel | undefined {
  if (!lot?.expiry) return undefined;
  return expiryLevel(lot.expiry);
}

export function formatLotExpiry(lot: LotInfo): string {
  return lot.expiry ? deDate(lot.expiry) : "";
}
