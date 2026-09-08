import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRefreshToken,
  setPkceSession,
  setSessionAuth,
} from "@/lib/tokenStorage";
import { resetStorageAvailabilityCache } from "@/lib/webStorage";
import {
  finishOAuthCallback,
  refreshSession,
  resetOAuthCallbackGate,
} from "@/services/authService";

const localMemory = new Map<string, string>();
const sessionMemory = new Map<string, string>();

function mockStore(map: Map<string, string>) {
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

function stubBrowserStorage() {
  localMemory.clear();
  sessionMemory.clear();
  resetStorageAvailabilityCache();
  const localStorage = mockStore(localMemory);
  const sessionStorage = mockStore(sessionMemory);
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("sessionStorage", sessionStorage);
  vi.stubGlobal("window", { localStorage, sessionStorage });
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("finishOAuthCallback", () => {
  beforeEach(() => {
    resetOAuthCallbackGate();
    stubBrowserStorage();
    setPkceSession({
      verifier: "verifier-1",
      state: "state-1",
      redirectUri: "http://localhost:3000/auth/callback",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("exchanges an authorization code only once when called in parallel", async () => {
    let tokenCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/token")) {
          tokenCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 40));
          return jsonResponse({
            access_token: "at-1",
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: "rt-1",
          });
        }
        if (url.includes("/api/auth/me")) {
          return jsonResponse({
            data: {
              email: "max@example.com",
              first_name: "Max",
              last_name: "Mustermann",
              custnr: "10042",
            },
          });
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    const input = { code: "code-1", state: "state-1", error: null };
    const [a, b] = await Promise.all([
      finishOAuthCallback(input),
      finishOAuthCallback(input),
    ]);

    expect(tokenCalls).toBe(1);
    expect(a.profile.custnr).toBe("10042");
    expect(b.profile.custnr).toBe("10042");
  });

  it("reuses a completed exchange instead of posting the code again", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/auth/token")) {
        return jsonResponse({
          access_token: "at-1",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "rt-1",
        });
      }
      if (url.includes("/api/auth/me")) {
        return jsonResponse({
          data: { email: "max@example.com", custnr: "10042" },
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const input = { code: "code-1", state: "state-1", error: null };
    await finishOAuthCallback(input);
    resetOAuthCallbackGate();
    const again = await finishOAuthCallback(input);

    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).includes("/api/auth/token"),
      ),
    ).toHaveLength(1);
    expect(again.profile.custnr).toBe("10042");
  });
});

describe("refreshSession", () => {
  beforeEach(() => {
    stubBrowserStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("coalesces parallel refresh calls into one network request", async () => {
    setSessionAuth({
      accessToken: "at-expired",
      refreshToken: "rt-1",
      expiresIn: 1,
    });

    let refreshCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/auth/refresh")) {
          refreshCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 40));
          return jsonResponse({
            access_token: "at-new",
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: "rt-2",
          });
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    const [a, b] = await Promise.all([refreshSession(), refreshSession()]);
    expect(refreshCalls).toBe(1);
    expect(a).toBe("at-new");
    expect(b).toBe("at-new");
  });

  it("does not clear tokens on a server/network refresh failure", async () => {
    setSessionAuth({
      accessToken: "at-expired",
      refreshToken: "rt-keep",
      expiresIn: 1,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "unavailable" }, 502)),
    );
    await expect(refreshSession()).rejects.toThrow();
    expect(getRefreshToken()).toBe("rt-keep");
  });
});
