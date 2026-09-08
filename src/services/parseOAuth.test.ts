import { describe, expect, it } from "vitest";
import {
  extractOAuthError,
  parseOAuthProfileResponse,
  parseOAuthTokenResponse,
} from "@/services/parseOAuth";

describe("parseOAuthTokenResponse", () => {
  it("parses RFC token payload", () => {
    const parsed = parseOAuthTokenResponse({
      access_token: "at-1",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "rt-1",
      scope: "profile api",
    });
    expect(parsed?.access_token).toBe("at-1");
    expect(parsed?.refresh_token).toBe("rt-1");
    expect(parsed?.expires_in).toBe(3600);
  });

  it("parses nested data wrapper", () => {
    const parsed = parseOAuthTokenResponse({
      status: "success",
      data: { access_token: "at-2", expires_in: 60 },
    });
    expect(parsed?.access_token).toBe("at-2");
    expect(parsed?.expires_in).toBe(60);
  });

  it("rejects missing access_token", () => {
    expect(parseOAuthTokenResponse({ token_type: "Bearer" })).toBeNull();
  });
});

describe("parseOAuthProfileResponse", () => {
  it("reads oauthme success data", () => {
    const profile = parseOAuthProfileResponse({
      status: "success",
      data: {
        email: "user@example.com",
        custnr: "10042",
        first_name: "Max",
      },
    });
    expect(profile?.custnr).toBe("10042");
    expect(profile?.email).toBe("user@example.com");
  });

  it("rejects error status", () => {
    expect(
      parseOAuthProfileResponse({ status: "error", message: "nope" }),
    ).toBeNull();
  });
});

describe("extractOAuthError", () => {
  it("prefers error_description", () => {
    expect(
      extractOAuthError(
        { error: "invalid_grant", error_description: "Code expired" },
        "fallback",
      ),
    ).toBe("Code expired");
  });
});
