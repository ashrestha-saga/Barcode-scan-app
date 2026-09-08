import { NextResponse } from "next/server";
import { bearerFromRequest } from "@/lib/bearer";
import { ShopApiError } from "@/services/http";
import { updateShopCart, type UpdateCartItem } from "@/services/shopServer";

function readPin(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const pin = (body as { pin?: unknown }).pin;
  return typeof pin === "string" && pin.trim() ? pin.trim() : null;
}

function parseItems(body: unknown): UpdateCartItem[] {
  if (!body || typeof body !== "object") return [];
  const raw = (body as { items?: unknown }).items;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const id =
        typeof (row as { id?: unknown }).id === "string"
          ? (row as { id: string }).id.trim()
          : "";
      const amountRaw = (row as { amount?: unknown }).amount;
      const amount =
        typeof amountRaw === "number"
          ? amountRaw
          : typeof amountRaw === "string"
            ? Number(amountRaw)
            : NaN;
      if (!id || !Number.isFinite(amount) || amount < 0) return null;
      return { id, amount: Math.floor(amount) };
    })
    .filter((row): row is UpdateCartItem => row !== null);
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

  const items = parseItems(body);
  const pin = readPin(body);
  if (!items.length) {
    return NextResponse.json({ error: "Keine Warenkorb-Positionen." }, { status: 400 });
  }

  console.info("[api/checkout/updatecart] incoming", {
    count: items.length,
    hasPin: Boolean(pin),
  });

  try {
    const data = await updateShopCart(items, token, pin);
    return NextResponse.json({ status: "success", data });
  } catch (err) {
    const status = err instanceof ShopApiError ? err.status : 502;
    const message =
      err instanceof Error
        ? err.message
        : "Warenkorb konnte nicht aktualisiert werden.";
    console.error("[api/checkout/updatecart] failed", { status, message });
    return NextResponse.json({ error: message }, { status });
  }
}
