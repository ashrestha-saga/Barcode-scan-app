import { NextResponse } from "next/server";
import { ShopApiError } from "@/services/http";
import { refreshOAuthToken } from "@/services/shopServer";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const refresh_token =
    typeof (body as { refresh_token?: unknown }).refresh_token === "string"
      ? (body as { refresh_token: string }).refresh_token.trim()
      : "";

  if (!refresh_token) {
    return NextResponse.json(
      { error: "refresh_token ist erforderlich." },
      { status: 400 },
    );
  }

  try {
    const tokens = await refreshOAuthToken(refresh_token);
    return NextResponse.json(tokens);
  } catch (err) {
    const status = err instanceof ShopApiError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "Token-Erneuerung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status });
  }
}
