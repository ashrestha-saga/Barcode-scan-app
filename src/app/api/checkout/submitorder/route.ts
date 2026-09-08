import { NextResponse } from "next/server";
import { bearerFromRequest } from "@/lib/bearer";
import { ShopApiError } from "@/services/http";
import { submitShopOrder } from "@/services/shopServer";

function readStringField(body: unknown, key: string): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

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

  const pin = readStringField(body, "pin");
  const remark = readStringField(body, "remark") ?? undefined;
  const deliveryAddressId = readStringField(body, "delivery_address_id");

  console.info("[api/checkout/submitorder] incoming", {
    hasPin: Boolean(pin),
    hasDeliveryAddressId: Boolean(deliveryAddressId),
  });

  try {
    const shopPayload = await submitShopOrder(token, {
      pin,
      remark,
      deliveryAddressId,
    });
    // Pass through shop shape: { status, data: { success, order: { number, ... } } }
    if (
      shopPayload &&
      typeof shopPayload === "object" &&
      "status" in shopPayload
    ) {
      return NextResponse.json(shopPayload);
    }
    return NextResponse.json({ status: "success", data: shopPayload });
  } catch (err) {
    const status = err instanceof ShopApiError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "Bestellung fehlgeschlagen.";
    console.error("[api/checkout/submitorder] failed", { status, message });
    return NextResponse.json({ error: message }, { status });
  }
}
