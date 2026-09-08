import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSessionAuth,
  getAccessToken,
  getRefreshToken,
  getStoredAccount,
  setSessionAuth,
  setStoredAccount,
} from "@/lib/tokenStorage";
import { resetStorageAvailabilityCache } from "@/lib/webStorage";

const local = new Map<string, string>();
const session = new Map<string, string>();

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

describe("tokenStorage persistence", () => {
  beforeEach(() => {
    local.clear();
    session.clear();
    resetStorageAvailabilityCache();
    vi.stubGlobal("localStorage", mockStore(local));
    vi.stubGlobal("sessionStorage", mockStore(session));
    vi.stubGlobal("window", {
      localStorage: mockStore(local),
      sessionStorage: mockStore(session),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes tokens to localStorage so a PWA cold start can restore them", () => {
    setSessionAuth({
      accessToken: "at-live",
      refreshToken: "rt-live",
      expiresIn: 3600,
    });
    expect(local.get("scanorder.token")).toBe("at-live");
    expect(local.get("scanorder.refreshToken")).toBe("rt-live");
    expect(session.has("scanorder.token")).toBe(false);
    expect(getAccessToken()).toBe("at-live");
    expect(getRefreshToken()).toBe("rt-live");
  });

  it("migrates a leftover sessionStorage session into localStorage", () => {
    session.set("scanorder.token", "at-old");
    session.set("scanorder.refreshToken", "rt-old");
    expect(getAccessToken()).toBe("at-old");
    expect(local.get("scanorder.token")).toBe("at-old");
    expect(session.has("scanorder.token")).toBe(false);
  });

  it("clears durable and session keys on logout", () => {
    setSessionAuth({
      accessToken: "at-live",
      refreshToken: "rt-live",
      expiresIn: 3600,
    });
    clearSessionAuth();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(local.size).toBe(0);
  });

  it("persists validatepin child as scanorder.account", () => {
    setStoredAccount({
      oxid: "e8d3073472958653dc46b1b769fb3264",
      salutation: "MR",
      first_name: "Ray",
      last_name: "Victor",
      custnr: "2021",
    });
    expect(local.get("scanorder.account")).toContain("Ray");
    expect(getStoredAccount()?.custnr).toBe("2021");
    setStoredAccount(null);
    expect(getStoredAccount()).toBeNull();
  });
});
