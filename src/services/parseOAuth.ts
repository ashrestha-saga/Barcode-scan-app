import type {
  OAuthProfile,
  OAuthProfileResponse,
  OAuthTokenResponse,
} from "@/interfaces/auth";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readTokenShape(obj: Record<string, unknown>): OAuthTokenResponse | null {
  if (typeof obj.access_token !== "string" || !obj.access_token) return null;
  const expiresIn = Number(obj.expires_in);
  return {
    access_token: obj.access_token,
    token_type: typeof obj.token_type === "string" ? obj.token_type : "Bearer",
    expires_in: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600,
    refresh_token:
      typeof obj.refresh_token === "string" && obj.refresh_token
        ? obj.refresh_token
        : undefined,
    scope: typeof obj.scope === "string" ? obj.scope : undefined,
  };
}

export function parseOAuthTokenResponse(
  payload: unknown,
): OAuthTokenResponse | null {
  const obj = asRecord(payload);
  if (!obj) return null;
  const direct = readTokenShape(obj);
  if (direct) return direct;
  const nested = asRecord(obj.data);
  return nested ? readTokenShape(nested) : null;
}

export function parseOAuthProfileResponse(payload: unknown): OAuthProfile | null {
  const obj = asRecord(payload);
  if (!obj) return null;
  if (obj.status && obj.status !== "success") return null;
  const data = asRecord(obj.data) ?? obj;
  if (!data.email && !data.custnr && !data.sub) return null;
  return data as OAuthProfile;
}

export function extractOAuthError(payload: unknown, fallback: string): string {
  const obj = asRecord(payload) as OAuthProfileResponse | null;
  if (!obj) return fallback;
  if (typeof obj.error_description === "string" && obj.error_description.trim()) {
    return obj.error_description.trim();
  }
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim();
  if (typeof obj.error === "string" && obj.error.trim()) return obj.error.trim();
  return fallback;
}
