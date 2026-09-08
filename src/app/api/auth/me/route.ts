import { NextResponse } from "next/server";
import { bearerFromRequest } from "@/lib/bearer";
import { ShopApiError } from "@/services/http";
import { fetchOAuthProfile } from "@/services/shopServer";

export async function GET(req: Request) {
  const token = bearerFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const profile = await fetchOAuthProfile(token);
    return NextResponse.json({ status: "success", data: profile });
  } catch (err) {
    const status = err instanceof ShopApiError ? err.status : 502;
    const message =
      err instanceof Error ? err.message : "Profilabfrage fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status });
  }
}
