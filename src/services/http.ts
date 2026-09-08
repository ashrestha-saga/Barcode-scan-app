import { getShopBaseUrl } from "./config";
import { getAccessToken } from "@/lib/tokenStorage";

export class ShopApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ShopApiError";
  }
}

function looksLikeHtml(text: string): boolean {
  const start = text.trim().slice(0, 32).toLowerCase();
  return start.startsWith("<!doctype") || start.startsWith("<html");
}

export function parseResponseText(text: string, status: number): unknown {
  if (!text) return null;
  if (looksLikeHtml(text)) {
    if (/wartung|maintenance/i.test(text)) {
      throw new ShopApiError(
        "Shop ist im Wartungsmodus. Bitte später erneut versuchen.",
        503,
      );
    }
    if (status === 401 || /unauthorized/i.test(text)) {
      throw new ShopApiError(
        "Shop-Server hat den Zugriff verweigert (401).",
        401,
      );
    }
    throw new ShopApiError("Unerwartete Antwort vom Shop (kein JSON).", status);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  return parseResponseText(text, res.status);
}

/** Browser → shop HTTP. Attaches Bearer token when present. */
export async function shopFetch(
  url: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<Response> {
  const { auth = true, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (auth) {
    const token = getAccessToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return fetch(url, { ...rest, headers, cache: "no-store" });
}

export function shopUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const base = getShopBaseUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
