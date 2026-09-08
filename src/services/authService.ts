import type { OAuthProfile, OAuthTokenResponse } from "@/interfaces/auth";
import type { ShippingAddress } from "@/interfaces/domain";
import { pkceChallenge, randomUrlSafe } from "@/lib/pkce";
import { shippingAddressesFromProfile } from "@/lib/oauthProfile";
import {
  clearConsumedAuthCode,
  clearPkce,
  clearSessionAuth,
  getAccessToken,
  getConsumedAuthCode,
  getPkceSession,
  getRefreshToken,
  getStoredShippingAddresses,
  getStoredProfile,
  isTokenExpired,
  setConsumedAuthCode,
  setNeedsAddressPick,
  setNeedsBasketCheck,
  setNeedsChildPin,
  setPkceSession,
  setSessionAuth,
  setStoredAccount,
  setStoredProfile,
} from "@/lib/tokenStorage";
import { profileRequiresSessionPin } from "@/lib/sessionPin";
import {
  getOAuthAuthorizeUrl,
  getOAuthClientId,
  getOAuthScope,
  oauthRedirectUri,
} from "@/services/config";
import { ShopApiError } from "@/services/http";

type OAuthCallbackResult = {
  profile: OAuthProfile;
  shippingAddresses: ShippingAddress[];
};

/** One attempt per authorization code. Survives React Strict Mode remounts. */
const callbackAttempts = new Map<string, Promise<OAuthCallbackResult>>();

export function resetOAuthCallbackGate() {
  callbackAttempts.clear();
}

let refreshInflight: Promise<string> | null = null;

export function oauthConfigured(): boolean {
  return Boolean(getOAuthClientId());
}

export async function startOAuthLogin(): Promise<void> {
  const clientId = getOAuthClientId();
  if (!clientId) {
    throw new ShopApiError(
      "OAuth-Client-ID fehlt (NEXT_PUBLIC_OAUTH_CLIENT_ID).",
      503,
    );
  }

  const verifier = randomUrlSafe(64);
  const state = randomUrlSafe(32);
  const redirectUri = oauthRedirectUri(window.location.origin);
  const challenge = await pkceChallenge(verifier);
  resetOAuthCallbackGate();
  clearConsumedAuthCode();
  setPkceSession({ verifier, state, redirectUri });

  const url = new URL(getOAuthAuthorizeUrl());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", getOAuthScope());
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  window.location.assign(url.toString());
}

function reusedCallback(code: string): OAuthCallbackResult | null {
  if (getConsumedAuthCode() !== code) return null;
  const profile = getStoredProfile();
  if (!getAccessToken() || !profile) return null;
  const stored = getStoredShippingAddresses();
  return {
    profile,
    shippingAddresses:
      stored.length > 0 ? stored : shippingAddressesFromProfile(profile),
  };
}

export function finishOAuthCallback(input: {
  code: string | null;
  state: string | null;
  error: string | null;
}): Promise<OAuthCallbackResult> {
  if (input.error) {
    clearPkce();
    return Promise.reject(new ShopApiError(input.error, 400));
  }
  if (!input.code || !input.state) {
    return Promise.reject(new ShopApiError("OAuth-Antwort unvollständig.", 400));
  }

  const key = `${input.code}:${input.state}`;
  const pending = callbackAttempts.get(key);
  if (pending) return pending;

  const reused = reusedCallback(input.code);
  if (reused) return Promise.resolve(reused);

  const attempt = exchangeOAuthCallback(input.code, input.state);
  callbackAttempts.set(key, attempt);
  return attempt;
}

async function exchangeOAuthCallback(
  code: string,
  state: string,
): Promise<OAuthCallbackResult> {
  const pkce = getPkceSession();
  if (!pkce) {
    throw new ShopApiError(
      "Anmeldesitzung abgelaufen. Bitte erneut anmelden.",
      400,
    );
  }
  if (pkce.state !== state) {
    clearPkce();
    throw new ShopApiError("Ungültiger OAuth-State.", 400);
  }

  const tokenRes = await fetch("/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      code,
      code_verifier: pkce.verifier,
      redirect_uri: pkce.redirectUri,
    }),
    cache: "no-store",
  });
  const tokens = (await tokenRes.json().catch(() => null)) as
    | (OAuthTokenResponse & { error?: string })
    | null;
  if (!tokenRes.ok || !tokens?.access_token) {
    throw new ShopApiError(
      tokens?.error || `Token-Austausch fehlgeschlagen (${tokenRes.status})`,
      tokenRes.status,
    );
  }

  setSessionAuth({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  });
  setConsumedAuthCode(code);
  clearPkce();

  const meRes = await fetch("/api/auth/me", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${tokens.access_token}`,
    },
    cache: "no-store",
  });
  const mePayload = (await meRes.json().catch(() => null)) as {
    data?: OAuthProfile;
    error?: string;
  } | null;
  if (!meRes.ok || !mePayload?.data) {
    throw new ShopApiError(
      mePayload?.error || `Profilabfrage fehlgeschlagen (${meRes.status})`,
      meRes.status,
    );
  }

  const profile = mePayload.data;
  const shippingAddresses = shippingAddressesFromProfile(profile);
  setStoredProfile(profile, shippingAddresses);
  // Order initiator is set only after validatepin (child) — clear stale account.
  setStoredAccount(null);
  setNeedsChildPin(profileRequiresSessionPin(profile));
  setNeedsBasketCheck(true);
  setNeedsAddressPick(shippingAddresses.length > 1);
  return { profile, shippingAddresses };
}

export async function refreshSession(): Promise<string> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = exclusiveRefresh().finally(() => {
    refreshInflight = null;
  });
  return refreshInflight;
}

async function exclusiveRefresh(): Promise<string> {
  const run = () => performTokenRefresh();
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks?.request) {
    return locks.request("scanorder-oauth-refresh", { mode: "exclusive" }, run);
  }
  return run();
}

async function performTokenRefresh(): Promise<string> {
  const current = getAccessToken();
  if (current && !isTokenExpired()) return current;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new ShopApiError("Keine Erneuerung möglich. Bitte erneut anmelden.", 401);
  }

  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  const tokens = (await res.json().catch(() => null)) as
    | (OAuthTokenResponse & { error?: string })
    | null;
  if (!res.ok || !tokens?.access_token) {
    if (res.status === 400 || res.status === 401) clearSessionAuth();
    throw new ShopApiError(
      tokens?.error || `Token-Erneuerung fehlgeschlagen (${res.status})`,
      res.status,
    );
  }

  setSessionAuth({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? refreshToken,
    expiresIn: tokens.expires_in,
  });
  return tokens.access_token;
}

export async function ensureAccessToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token && !isTokenExpired()) return token;
  try {
    return await refreshSession();
  } catch {
    return null;
  }
}

export async function logoutOAuth(): Promise<void> {
  const access = getAccessToken();
  const refresh = getRefreshToken();
  try {
    if (access) {
      await fetch("/api/auth/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: access, token_type_hint: "access_token" }),
        cache: "no-store",
      });
    }
    if (refresh) {
      await fetch("/api/auth/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: refresh,
          token_type_hint: "refresh_token",
        }),
        cache: "no-store",
      });
    }
  } finally {
    clearSessionAuth();
  }
}
