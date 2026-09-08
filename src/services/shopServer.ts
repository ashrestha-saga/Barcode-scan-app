import { ShopApiError, parseResponseText } from "@/services/http";
import {
  getAddToCartUrl,
  getArticlesUrl,
  getCartUrl,
  getOAuthClientId,
  getOAuthClientSecret,
  getOAuthMeUrl,
  getOAuthRevokeUrl,
  getOAuthTokenUrl,
  getSubmitOrderUrl,
  getUpdateCartUrl,
  getValidatePinUrl,
} from "@/services/config";
import {
  extractCheckoutError,
  parseShopCartResponse,
  parseValidatePinResponse,
  type ShopCartLine,
  type ValidatedChild,
} from "@/services/parseCheckout";
import {
  extractOAuthError,
  parseOAuthProfileResponse,
  parseOAuthTokenResponse,
} from "@/services/parseOAuth";
import {
  extractArticleError,
  parseGetArticlesResponse,
} from "@/services/parseArticleResponse";
import type { OAuthProfile, OAuthTokenResponse } from "@/interfaces/auth";
import type { ArticleLookupKey, ShopArticle } from "@/interfaces/article";

function redactBody(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const copy = { ...(body as Record<string, unknown>) };
  for (const key of ["password", "client_secret", "code", "code_verifier", "refresh_token", "token", "pin"]) {
    if (key in copy) copy[key] = "***";
  }
  return copy;
}

function previewText(text: string, max = 500): string {
  const compact = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/("access_token"\s*:\s*")[^"]+"/i, '$1***"')
    .replace(/("refresh_token"\s*:\s*")[^"]+"/i, '$1***"')
    .replace(/("token"\s*:\s*")[^"]+"/i, '$1***"')
    .replace(/("pin"\s*:\s*")[^"]+"/i, '$1***"');
  return compact.length > max ? `${compact.slice(0, max)}…` : compact;
}

async function shopRequest(
  url: string,
  init: {
    method: "GET" | "POST";
    token?: string;
    encoding?: "json" | "form";
    body?: unknown;
  },
): Promise<{ res: Response; payload: unknown }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;

  let serialized: string | undefined;
  if (init.method === "POST") {
    const encoding = init.encoding ?? "json";
    headers["Content-Type"] =
      encoding === "form"
        ? "application/x-www-form-urlencoded"
        : "application/json";
    serialized =
      encoding === "form"
        ? new URLSearchParams(
            Object.entries((init.body ?? {}) as Record<string, string>).map(
              ([k, v]) => [k, String(v)],
            ),
          ).toString()
        : JSON.stringify(init.body ?? {});
  }

  console.info("[shop] request", {
    url,
    method: init.method,
    encoding: init.encoding ?? (init.method === "GET" ? undefined : "json"),
    auth: Boolean(init.token),
    body: init.body ? redactBody(init.body) : undefined,
  });

  const res = await fetch(url, {
    method: init.method,
    headers,
    body: serialized,
    cache: "no-store",
  });
  const raw = await res.text();
  console.info("[shop] response", {
    url,
    status: res.status,
    ok: res.ok,
    contentType: res.headers.get("content-type"),
    preview: previewText(raw),
  });

  const payload = parseResponseText(raw, res.status);
  return { res, payload };
}

function oauthClient(): { client_id: string; client_secret: string } {
  const client_id = getOAuthClientId();
  const client_secret = getOAuthClientSecret();
  if (!client_id || !client_secret) {
    throw new ShopApiError(
      "OAuth-Client ist nicht konfiguriert (NEXT_PUBLIC_OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET).",
      503,
    );
  }
  return { client_id, client_secret };
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  code_verifier: string;
  redirect_uri: string;
}): Promise<OAuthTokenResponse> {
  const client = oauthClient();
  const { res, payload } = await shopRequest(getOAuthTokenUrl(), {
    method: "POST",
    encoding: "form",
    body: {
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirect_uri,
      code_verifier: input.code_verifier,
      ...client,
    },
  });
  const parsed = parseOAuthTokenResponse(payload);
  if (!res.ok || !parsed) {
    throw new ShopApiError(
      extractOAuthError(payload, `Token-Austausch fehlgeschlagen (${res.status})`),
      res.ok ? 400 : res.status,
    );
  }
  return parsed;
}

export async function refreshOAuthToken(
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  const client = oauthClient();
  const { res, payload } = await shopRequest(getOAuthTokenUrl(), {
    method: "POST",
    encoding: "form",
    body: {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      ...client,
    },
  });
  const parsed = parseOAuthTokenResponse(payload);
  if (!res.ok || !parsed) {
    throw new ShopApiError(
      extractOAuthError(payload, `Token-Erneuerung fehlgeschlagen (${res.status})`),
      res.ok ? 401 : res.status,
    );
  }
  return parsed;
}

export async function revokeOAuthToken(
  token: string,
  hint: "access_token" | "refresh_token" = "access_token",
): Promise<void> {
  await shopRequest(getOAuthRevokeUrl(), {
    method: "POST",
    encoding: "form",
    body: {
      token,
      token_type_hint: hint,
    },
  });
}

export async function fetchOAuthProfile(token: string): Promise<OAuthProfile> {
  const { res, payload } = await shopRequest(getOAuthMeUrl(), {
    method: "GET",
    token,
  });
  const profile = parseOAuthProfileResponse(payload);
  if (!res.ok || !profile) {
    throw new ShopApiError(
      extractOAuthError(payload, `Profilabfrage fehlgeschlagen (${res.status})`),
      res.ok ? 401 : res.status,
    );
  }
  return profile;
}

export async function fetchShopArticles(
  lookupKey: ArticleLookupKey,
  values: string[],
  token: string,
): Promise<ShopArticle[]> {
  const ids = values.map((id) => id.trim()).filter(Boolean);
  if (!ids.length) return [];

  const { res, payload } = await shopRequest(getArticlesUrl(), {
    method: "POST",
    token,
    body: { [lookupKey]: ids },
  });

  const rows = parseGetArticlesResponse(payload);
  if (!res.ok || !rows) {
    throw new ShopApiError(
      extractArticleError(payload, `Artikelabfrage fehlgeschlagen (${res.status})`),
      res.status,
    );
  }
  return rows;
}

export type AddToCartArticle = { artnum: string; amount: number };

function withOptionalPin<T extends Record<string, unknown>>(
  body: T,
  pin?: string | null,
): T & { pin?: string } {
  const trimmed = pin?.trim();
  if (trimmed) return { ...body, pin: trimmed };
  return body;
}

export async function addToShopCart(
  articles: AddToCartArticle[],
  token: string,
  pin?: string | null,
): Promise<unknown> {
  const lines = articles
    .map((a) => ({
      artnum: a.artnum.trim(),
      amount: a.amount,
    }))
    .filter((a) => a.artnum && a.amount > 0);

  if (!lines.length) {
    throw new ShopApiError("Keine Artikel für den Warenkorb.", 400);
  }

  const { res, payload } = await shopRequest(getAddToCartUrl(), {
    method: "POST",
    token,
    body: withOptionalPin({ articles: lines }, pin),
  });

  if (!res.ok) {
    throw new ShopApiError(
      extractCheckoutError(payload, `Warenkorb-Update fehlgeschlagen (${res.status})`),
      res.status,
    );
  }

  return payload;
}

export async function fetchShopCart(
  token: string,
  pin?: string | null,
): Promise<ShopCartLine[]> {
  const { res, payload } = await shopRequest(getCartUrl(), {
    method: "POST",
    token,
    body: withOptionalPin({}, pin),
  });

  if (!res.ok) {
    throw new ShopApiError(
      extractCheckoutError(payload, `Warenkorb konnte nicht geladen werden (${res.status})`),
      res.status,
    );
  }

  return parseShopCartResponse(payload);
}

export type UpdateCartItem = { id: string; amount: number };

export async function updateShopCart(
  items: UpdateCartItem[],
  token: string,
  pin?: string | null,
): Promise<unknown> {
  const lines = items
    .map((i) => ({ id: i.id.trim(), amount: Math.max(0, Math.floor(i.amount)) }))
    .filter((i) => i.id);

  if (!lines.length) {
    throw new ShopApiError("Keine Warenkorb-Positionen.", 400);
  }

  const { res, payload } = await shopRequest(getUpdateCartUrl(), {
    method: "POST",
    token,
    body: withOptionalPin({ items: lines }, pin),
  });

  if (!res.ok) {
    throw new ShopApiError(
      extractCheckoutError(payload, `Warenkorb konnte nicht aktualisiert werden (${res.status})`),
      res.status,
    );
  }

  return payload;
}

export async function submitShopOrder(
  token: string,
  input: {
    pin?: string | null;
    remark?: string;
    deliveryAddressId?: string | null;
  },
): Promise<unknown> {
  const deliveryId = input.deliveryAddressId?.trim();
  const body = withOptionalPin(
    {
      ...(input.remark?.trim() ? { remark: input.remark.trim() } : {}),
      ...(deliveryId ? { delivery_address_id: deliveryId } : {}),
    },
    input.pin,
  );

  const { res, payload } = await shopRequest(getSubmitOrderUrl(), {
    method: "POST",
    token,
    body,
  });

  if (!res.ok) {
    throw new ShopApiError(
      extractCheckoutError(payload, `Bestellung fehlgeschlagen (${res.status})`),
      res.status,
    );
  }

  return payload;
}

export async function validateShopPin(
  pin: string,
  token: string,
): Promise<ValidatedChild> {
  const trimmed = pin.trim();
  const { res, payload } = await shopRequest(getValidatePinUrl(), {
    method: "POST",
    token,
    body: { pin: trimmed },
  });

  const root =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  const softFail = root?.success === false;

  if (!res.ok || softFail) {
    throw new ShopApiError(
      extractCheckoutError(payload, `PIN ungültig (${res.status})`),
      !res.ok ? res.status : 401,
    );
  }

  const child = parseValidatePinResponse(payload);
  if (!child) {
    throw new ShopApiError(
      extractCheckoutError(payload, "PIN ungültig."),
      401,
    );
  }
  return child;
}
