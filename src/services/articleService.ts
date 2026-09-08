import type { ArticleLookupKey } from "@/interfaces/article";
import type { Product } from "@/interfaces/domain";
import { ensureAccessToken, refreshSession } from "@/services/authService";
import { ShopApiError } from "@/services/http";
import { authHeaders } from "@/lib/tokenStorage";

async function postArticles(
  lookupKey: ArticleLookupKey,
  values: string[],
  scanned: string | undefined,
  token: string,
) {
  const requestBody = { lookupKey, [lookupKey]: values, scanned };
  console.info("[articles] browser → POST /api/articles", requestBody);

  return fetch("/api/articles", {
    method: "POST",
    headers: { ...authHeaders(), Authorization: `Bearer ${token}` },
    body: JSON.stringify(requestBody),
    cache: "no-store",
  });
}

export async function fetchArticleProducts(
  values: string[],
  lookupKey: ArticleLookupKey = "oxean",
  scanned?: string,
): Promise<Product[]> {
  let token = await ensureAccessToken();
  if (!token) {
    throw new ShopApiError("Bitte erneut anmelden.", 401);
  }

  let res = await postArticles(lookupKey, values, scanned, token);
  if (res.status === 401) {
    try {
      token = await refreshSession();
      res = await postArticles(lookupKey, values, scanned, token);
    } catch {
      throw new ShopApiError("Bitte erneut anmelden.", 401);
    }
  }

  const payload = (await res.json().catch(() => null)) as {
    products?: Product[];
    error?: string;
  } | null;

  console.info("[articles] /api/articles response", {
    status: res.status,
    ok: res.ok,
    lookupKey,
    error: payload?.error ?? null,
    productCount: payload?.products?.length ?? 0,
    products: payload?.products ?? null,
  });

  if (!res.ok) {
    throw new ShopApiError(
      payload?.error || `Artikelabfrage fehlgeschlagen (${res.status})`,
      res.status,
    );
  }

  return payload?.products ?? [];
}
