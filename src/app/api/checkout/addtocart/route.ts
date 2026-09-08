import { NextResponse } from "next/server";
import { bearerFromRequest } from "@/lib/bearer";
import { ShopApiError } from "@/services/http";
import { addToShopCart, type AddToCartArticle } from "@/services/shopServer";

function readPin(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const pin = (body as { pin?: unknown }).pin;
  return typeof pin === "string" && pin.trim() ? pin.trim() : null;
}

function parseArticles(body: unknown): AddToCartArticle[] {
  if (!body || typeof body !== "object") return [];
  const raw = (body as { articles?: unknown }).articles;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const artnum =
        typeof (row as { artnum?: unknown }).artnum === "string"
          ? (row as { artnum: string }).artnum.trim()
          : "";
      const amountRaw = (row as { amount?: unknown }).amount;
      const amount =
        typeof amountRaw === "number"
          ? amountRaw
          : typeof amountRaw === "string"
            ? Number(amountRaw)
            : NaN;
      if (!artnum || !Number.isFinite(amount) || amount <= 0) return null;
      return { artnum, amount: Math.floor(amount) };
    })
    .filter((row): row is AddToCartArticle => row !== null);
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

  const articles = parseArticles(body);
  const pin = readPin(body);
  if (!articles.length) {
    return NextResponse.json({ error: "Keine Artikelnummern." }, { status: 400 });
  }

  console.info("[api/checkout/addtocart] incoming", {
    articles,
    hasPin: Boolean(pin),
  });

  try {
    const data = await addToShopCart(articles, token, pin);
    console.info("[api/checkout/addtocart] ok", { articleCount: articles.length });
    return NextResponse.json({ status: "success", data });
  } catch (err) {
    const status = err instanceof ShopApiError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "Warenkorb-Update fehlgeschlagen.";
    console.error("[api/checkout/addtocart] failed", { status, message });
    return NextResponse.json({ error: message }, { status });
  }
}
