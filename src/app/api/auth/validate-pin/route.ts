import { NextResponse } from "next/server";
import { bearerFromRequest } from "@/lib/bearer";
import { isValidSessionPin } from "@/lib/sessionPin";
import { ShopApiError } from "@/services/http";
import { validateShopPin } from "@/services/shopServer";

/** Proxies shop `POST ?cl=checkoutapi&fnc=validatepin`. */
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

  const pin =
    body &&
    typeof body === "object" &&
    typeof (body as { pin?: unknown }).pin === "string"
      ? (body as { pin: string }).pin.trim()
      : "";

  if (!isValidSessionPin(pin)) {
    return NextResponse.json(
      { error: "invalid_pin", message: "PIN muss aus 3 bis 11 Ziffern bestehen." },
      { status: 400 },
    );
  }

  console.info("[api/auth/validate-pin] incoming");

  try {
    const child = await validateShopPin(pin, token);
    console.info("[api/auth/validate-pin] ok", {
      childOxid: child.oxid,
      custnr: child.custnr ?? null,
    });
    return NextResponse.json({
      status: "success",
      data: { success: true, child },
    });
  } catch (err) {
    const status = err instanceof ShopApiError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "PIN ungültig.";
    console.error("[api/auth/validate-pin] failed", { status, message });
    return NextResponse.json(
      { error: "invalid_pin", message },
      { status: status >= 400 && status < 600 ? status : 401 },
    );
  }
}
