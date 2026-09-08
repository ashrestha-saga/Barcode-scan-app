import type { CartItem } from "@/interfaces/domain";
import { loadDecryptedSessionPin } from "@/lib/pinVault";
import { authHeaders } from "@/lib/tokenStorage";
import { ensureAccessToken, refreshSession } from "@/services/authService";
import { ShopApiError } from "@/services/http";
import {
  shopCartToLocalItems,
  parseSubmitOrderResponse,
  type ShopCartLine,
  type SubmittedOrder,
  type ValidatedChild,
} from "@/services/parseCheckout";

export type AddToCartLine = { artnum: string; amount: number };

/** Map local cart lines to shop addtocart payload (amount = qty only). */
export function cartItemsToAddToCartLines(cart: CartItem[]): AddToCartLine[] {
  const bySku = new Map<string, number>();
  for (const item of cart) {
    if (item.unknown) continue;
    const artnum = item.sku.trim();
    if (!artnum) continue;
    bySku.set(artnum, (bySku.get(artnum) ?? 0) + item.qty);
  }
  return [...bySku.entries()].map(([artnum, amount]) => ({ artnum, amount }));
}

async function authedFetch(
  path: string,
  init: { method?: string; body?: unknown },
  token: string,
) {
  return fetch(path, {
    method: init.method ?? "POST",
    headers: { ...authHeaders(), Authorization: `Bearer ${token}` },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
}

async function withTokenRetry(
  run: (token: string) => Promise<Response>,
): Promise<Response> {
  let token = await ensureAccessToken();
  if (!token) throw new ShopApiError("Bitte erneut anmelden.", 401);
  let res = await run(token);
  if (res.status === 401) {
    try {
      token = await refreshSession();
      res = await run(token);
    } catch {
      throw new ShopApiError("Bitte erneut anmelden.", 401);
    }
  }
  return res;
}

async function optionalPinBody<T extends Record<string, unknown>>(
  body: T,
): Promise<T & { pin?: string }> {
  const pin = await loadDecryptedSessionPin();
  if (pin) return { ...body, pin };
  return body;
}

export async function validateSessionPin(pin: string): Promise<ValidatedChild> {
  const body = { pin };
  console.info("[checkout] browser → POST /api/auth/validate-pin");

  const res = await withTokenRetry((token) =>
    authedFetch("/api/auth/validate-pin", { body }, token),
  );
  const payload = (await res.json().catch(() => null)) as {
    data?: { child?: ValidatedChild; success?: boolean };
    error?: string;
    message?: string;
  } | null;

  if (!res.ok) {
    throw new ShopApiError(
      payload?.message ||
        (typeof payload?.error === "string" ? payload.error : null) ||
        "PIN ungültig.",
      res.status,
    );
  }

  const child = payload?.data?.child;
  if (!child?.oxid) {
    throw new ShopApiError("PIN ungültig.", 401);
  }
  return child;
}

export async function fetchShopBasket(): Promise<ShopCartLine[]> {
  const body = await optionalPinBody({});
  console.info("[checkout] browser → POST /api/checkout/getcart", {
    hasPin: Boolean(body.pin),
  });

  const res = await withTokenRetry((token) =>
    authedFetch("/api/checkout/getcart", { body }, token),
  );
  const payload = (await res.json().catch(() => null)) as {
    data?: { items?: ShopCartLine[] };
    error?: string;
  } | null;
  if (!res.ok) {
    throw new ShopApiError(
      payload?.error || `Warenkorb konnte nicht geladen werden (${res.status})`,
      res.status,
    );
  }
  return payload?.data?.items ?? [];
}

export async function clearShopBasket(items: ShopCartLine[]): Promise<void> {
  if (!items.length) return;
  const body = await optionalPinBody({
    items: items.map((i) => ({ id: i.id, amount: 0 })),
  });
  const res = await withTokenRetry((token) =>
    authedFetch("/api/checkout/updatecart", { body }, token),
  );
  const payload = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    throw new ShopApiError(
      payload?.error || `Warenkorb konnte nicht geleert werden (${res.status})`,
      res.status,
    );
  }
}

export async function addCartToShop(cart: CartItem[]): Promise<unknown> {
  const articles = cartItemsToAddToCartLines(cart);
  if (!articles.length) {
    throw new ShopApiError("Keine bestellbaren Artikel im Warenkorb.", 400);
  }

  const body = await optionalPinBody({ articles });
  console.info("[checkout] browser → POST /api/checkout/addtocart", {
    articles,
    hasPin: Boolean(body.pin),
  });

  const res = await withTokenRetry((token) =>
    authedFetch("/api/checkout/addtocart", { body }, token),
  );
  const payload = (await res.json().catch(() => null)) as {
    data?: unknown;
    error?: string;
  } | null;

  if (!res.ok) {
    throw new ShopApiError(
      payload?.error || `Warenkorb-Update fehlgeschlagen (${res.status})`,
      res.status,
    );
  }
  return payload?.data ?? payload;
}

export async function submitOrderToShop(input?: {
  remark?: string;
  deliveryAddressId?: string | null;
}): Promise<SubmittedOrder> {
  const deliveryAddressId = input?.deliveryAddressId?.trim();
  const body = await optionalPinBody({
    ...(input?.remark?.trim() ? { remark: input.remark.trim() } : {}),
    ...(deliveryAddressId ? { delivery_address_id: deliveryAddressId } : {}),
  });
  console.info("[checkout] browser → POST /api/checkout/submitorder", {
    hasPin: Boolean(body.pin),
    delivery_address_id: deliveryAddressId ?? null,
  });

  const res = await withTokenRetry((token) =>
    authedFetch("/api/checkout/submitorder", { body }, token),
  );
  const payload = (await res.json().catch(() => null)) as {
    data?: unknown;
    error?: string;
  } | null;

  if (!res.ok) {
    throw new ShopApiError(
      payload?.error || `Bestellung fehlgeschlagen (${res.status})`,
      res.status,
    );
  }

  const submitted =
    parseSubmitOrderResponse(payload) ??
    parseSubmitOrderResponse(payload?.data);
  if (!submitted) {
    throw new ShopApiError("Bestellung ohne Auftragsnummer.", 502);
  }
  return submitted;
}

export { shopCartToLocalItems };
