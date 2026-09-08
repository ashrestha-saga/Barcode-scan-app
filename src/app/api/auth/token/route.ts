import { NextResponse } from "next/server";
import { ShopApiError } from "@/services/http";
import { exchangeAuthorizationCode } from "@/services/shopServer";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const code = typeof (body as { code?: unknown }).code === "string"
    ? (body as { code: string }).code.trim()
    : "";
  const code_verifier =
    typeof (body as { code_verifier?: unknown }).code_verifier === "string"
      ? (body as { code_verifier: string }).code_verifier.trim()
      : "";
  const redirect_uri =
    typeof (body as { redirect_uri?: unknown }).redirect_uri === "string"
      ? (body as { redirect_uri: string }).redirect_uri.trim()
      : "";

  if (!code || !code_verifier || !redirect_uri) {
    return NextResponse.json(
      { error: "code, code_verifier und redirect_uri sind erforderlich." },
      { status: 400 },
    );
  }

  try {
    const tokens = await exchangeAuthorizationCode({
      code,
      code_verifier,
      redirect_uri,
    });
    return NextResponse.json(tokens);
  } catch (err) {
    const status = err instanceof ShopApiError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "Token-Austausch fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status });
  }
}
