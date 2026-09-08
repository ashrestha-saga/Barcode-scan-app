import { NextResponse } from "next/server";
import { ShopApiError } from "@/services/http";
import { revokeOAuthToken } from "@/services/shopServer";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const token =
    typeof (body as { token?: unknown }).token === "string"
      ? (body as { token: string }).token.trim()
      : "";
  const hintRaw = (body as { token_type_hint?: unknown }).token_type_hint;
  const token_type_hint =
    hintRaw === "refresh_token" ? "refresh_token" : "access_token";

  if (!token) {
    return NextResponse.json({ error: "token ist erforderlich." }, { status: 400 });
  }

  try {
    await revokeOAuthToken(token, token_type_hint);
    return NextResponse.json({ status: "success" });
  } catch (err) {
    const status = err instanceof ShopApiError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "Abmeldung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status });
  }
}
