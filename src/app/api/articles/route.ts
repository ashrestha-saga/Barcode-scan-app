import { NextResponse } from "next/server";
import { bearerFromRequest } from "@/lib/bearer";
import type { ArticleLookupKey } from "@/interfaces/article";
import { mapShopArticleToProduct } from "@/services/articleMapper";
import { ShopApiError } from "@/services/http";
import { fetchShopArticles } from "@/services/shopServer";

const LOOKUP_KEYS = new Set<ArticleLookupKey>([
  "oxid",
  "oxartnum",
  "oxean",
  "oxdistean",
  "oxmpn",
  "gtin",
]);

function parseLookupKey(value: unknown): ArticleLookupKey | null {
  return typeof value === "string" && LOOKUP_KEYS.has(value as ArticleLookupKey)
    ? (value as ArticleLookupKey)
    : null;
}

function parseIds(body: Record<string, unknown>, key: ArticleLookupKey): string[] {
  const raw = body[key] ?? body.articles;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (id): id is string => typeof id === "string" && id.trim().length > 0,
  );
}

export async function POST(req: Request) {
  const token = bearerFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const record =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  if (!record) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const lookupKey =
    parseLookupKey(record.lookupKey) ??
    (Array.isArray(record.oxean)
      ? "oxean"
      : Array.isArray(record.oxartnum)
        ? "oxartnum"
        : "oxartnum");

  const ids = parseIds(record, lookupKey);
  if (!ids.length) {
    return NextResponse.json({ error: "Keine Artikelnummern." }, { status: 400 });
  }

  const scanned =
    typeof record.scanned === "string" ? record.scanned : undefined;

  console.info("[api/articles] incoming", { lookupKey, ids, scanned });

  try {
    const rows = await fetchShopArticles(lookupKey, ids, token);
    const products = rows
      .map((row) => mapShopArticleToProduct(row, scanned))
      .filter((p): p is NonNullable<typeof p> => p !== null);
    console.info("[api/articles] mapped products", {
      lookupKey,
      shopRows: rows.length,
      products: products.map((p) => ({
        oxid: p.oxid,
        sku: p.sku,
        name: p.name,
        price: p.price,
      })),
    });
    return NextResponse.json({ products });
  } catch (err) {
    const status = err instanceof ShopApiError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "Artikelabfrage fehlgeschlagen.";
    console.error("[api/articles] failed", { status, message });
    return NextResponse.json({ error: message }, { status });
  }
}
