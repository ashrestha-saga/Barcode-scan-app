import { NextResponse } from "next/server";
import { bearerFromRequest } from "@/lib/bearer";
import { ShopApiError } from "@/services/http";
import { fetchShopCart } from "@/services/shopServer";

function readPin(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const pin = (body as { pin?: unknown }).pin;
  return typeof pin === "string" && pin.trim() ? pin.trim() : null;
}

/** Proxies shop `POST ?cl=checkoutapi&fnc=getcart` with optional `{ pin }`. */
export async function POST(req: Request) {
  const token = bearerFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const pin = readPin(body);
  console.info("[api/checkout/getcart] incoming", { hasPin: Boolean(pin) });

  try {
    const items = await fetchShopCart(token, pin);
    console.info("[api/checkout/getcart] ok", { count: items.length });
    return NextResponse.json({ status: "success", data: { items } });
  } catch (err) {
    const status = err instanceof ShopApiError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "Warenkorb konnte nicht geladen werden.";
    console.error("[api/checkout/getcart] failed", { status, message });
    return NextResponse.json({ error: message }, { status });
  }
}
