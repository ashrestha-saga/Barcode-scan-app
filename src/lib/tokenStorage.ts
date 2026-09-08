import type { OAuthProfile } from "@/interfaces/auth";
import type { ShippingAddress } from "@/interfaces/domain";
import type { ValidatedChild } from "@/services/parseCheckout";
import {
  persistGet,
  persistRemove,
  persistSet,
  sessionGet,
  sessionRemove,
  sessionSet,
} from "@/lib/webStorage";

export const ACCESS_KEY = "scanorder.token";
export const REFRESH_KEY = "scanorder.refreshToken";
export const EXPIRE_KEY = "scanorder.expireAt";
const USER_KEY = "scanorder.username";
const PROFILE_KEY = "scanorder.profile";
const SHIPPING_KEY = "scanorder.shippingAddresses";
/** Order initiator (child unlocked by validatepin). */
const ACCOUNT_KEY = "scanorder.account";
/** @deprecated legacy key — read for migration only */
const LEGACY_ACCOUNTS_KEY = "scanorder.accounts";
const PICK_KEY = "scanorder.pickAddress";
const CHILD_PIN_KEY = "scanorder.needsChildPin";
const BASKET_KEY = "scanorder.needsBasketCheck";
const PKCE_VERIFIER_KEY = "scanorder.pkce.verifier";
const PKCE_STATE_KEY = "scanorder.pkce.state";
const PKCE_REDIRECT_KEY = "scanorder.pkce.redirectUri";
const CONSUMED_CODE_KEY = "scanorder.oauth.consumedCode";

const AUTH_PERSIST_KEYS = [
  ACCESS_KEY,
  REFRESH_KEY,
  EXPIRE_KEY,
  USER_KEY,
  PROFILE_KEY,
  SHIPPING_KEY,
  ACCOUNT_KEY,
  LEGACY_ACCOUNTS_KEY,
  PICK_KEY,
  CHILD_PIN_KEY,
  BASKET_KEY,
] as const;

export function isAuthPersistKey(key: string | null): boolean {
  return Boolean(key && (AUTH_PERSIST_KEYS as readonly string[]).includes(key));
}

function browser(): boolean {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!browser()) return null;
  return persistGet(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!browser()) return null;
  return persistGet(REFRESH_KEY);
}

export function getTokenExpireAt(): number | null {
  if (!browser()) return null;
  const raw = persistGet(EXPIRE_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function isTokenExpired(): boolean {
  const exp = getTokenExpireAt();
  if (!exp) return !getAccessToken();
  return Date.now() / 1000 >= exp - 30;
}

export function getStoredUsername(): string {
  if (!browser()) return "";
  return persistGet(USER_KEY) ?? "";
}

export function getStoredProfile(): OAuthProfile | null {
  if (!browser()) return null;
  const raw = persistGet(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OAuthProfile;
  } catch {
    return null;
  }
}

export function getStoredShippingAddresses(): ShippingAddress[] {
  if (!browser()) return [];
  const raw = persistGet(SHIPPING_KEY) ?? persistGet(LEGACY_ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ShippingAddress[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Child account that initiated the order (from validatepin). */
export function getStoredAccount(): ValidatedChild | null {
  if (!browser()) return null;
  const raw = persistGet(ACCOUNT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ValidatedChild;
    if (!parsed || typeof parsed.oxid !== "string" || !parsed.oxid.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredAccount(account: ValidatedChild | null) {
  if (!browser()) return;
  if (!account) {
    persistRemove(ACCOUNT_KEY);
    return;
  }
  persistSet(ACCOUNT_KEY, JSON.stringify(account));
}

export function needsAddressPick(): boolean {
  if (!browser()) return false;
  return persistGet(PICK_KEY) === "1";
}

export function setNeedsAddressPick(value: boolean) {
  if (!browser()) return;
  if (value) persistSet(PICK_KEY, "1");
  else persistRemove(PICK_KEY);
}

export function needsChildPin(): boolean {
  if (!browser()) return false;
  return persistGet(CHILD_PIN_KEY) === "1";
}

export function setNeedsChildPin(value: boolean) {
  if (!browser()) return;
  if (value) persistSet(CHILD_PIN_KEY, "1");
  else persistRemove(CHILD_PIN_KEY);
}

export function needsBasketCheck(): boolean {
  if (!browser()) return false;
  return persistGet(BASKET_KEY) === "1";
}

export function setNeedsBasketCheck(value: boolean) {
  if (!browser()) return;
  if (value) persistSet(BASKET_KEY, "1");
  else persistRemove(BASKET_KEY);
}

export function setSessionAuth(input: {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
  username?: string;
}) {
  persistSet(ACCESS_KEY, input.accessToken);
  persistSet(
    EXPIRE_KEY,
    String(Math.floor(Date.now() / 1000) + input.expiresIn),
  );
  if (input.refreshToken) persistSet(REFRESH_KEY, input.refreshToken);
  if (input.username) persistSet(USER_KEY, input.username);
}

export function setStoredProfile(
  profile: OAuthProfile,
  shippingAddresses: ShippingAddress[],
) {
  persistSet(PROFILE_KEY, JSON.stringify(profile));
  persistSet(SHIPPING_KEY, JSON.stringify(shippingAddresses));
  persistRemove(LEGACY_ACCOUNTS_KEY);
  const username = profile.email?.trim() || getStoredUsername();
  if (username) persistSet(USER_KEY, username);
}

export function clearSessionAuth() {
  for (const key of AUTH_PERSIST_KEYS) persistRemove(key);
  clearConsumedAuthCode();
  clearPkce();
}

export function getConsumedAuthCode(): string | null {
  if (!browser()) return null;
  return sessionGet(CONSUMED_CODE_KEY);
}

export function setConsumedAuthCode(code: string) {
  if (!browser()) return;
  sessionSet(CONSUMED_CODE_KEY, code);
}

export function clearConsumedAuthCode() {
  if (!browser()) return;
  sessionRemove(CONSUMED_CODE_KEY);
}

export function setPkceSession(input: {
  verifier: string;
  state: string;
  redirectUri: string;
}) {
  sessionSet(PKCE_VERIFIER_KEY, input.verifier);
  sessionSet(PKCE_STATE_KEY, input.state);
  sessionSet(PKCE_REDIRECT_KEY, input.redirectUri);
}

export function getPkceSession(): {
  verifier: string;
  state: string;
  redirectUri: string;
} | null {
  if (!browser()) return null;
  const verifier = sessionGet(PKCE_VERIFIER_KEY);
  const state = sessionGet(PKCE_STATE_KEY);
  const redirectUri = sessionGet(PKCE_REDIRECT_KEY);
  if (!verifier || !state || !redirectUri) return null;
  return { verifier, state, redirectUri };
}

export function clearPkce() {
  if (!browser()) return;
  sessionRemove(PKCE_VERIFIER_KEY);
  sessionRemove(PKCE_STATE_KEY);
  sessionRemove(PKCE_REDIRECT_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
