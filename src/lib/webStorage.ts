/** Safe Web Storage access. Private mode and quota can throw on setItem. */

const PROBE_KEY = "__scanorder_probe";

let localAvailable: boolean | null = null;
let sessionAvailable: boolean | null = null;

export function resetStorageAvailabilityCache() {
  localAvailable = null;
  sessionAvailable = null;
}

function probe(storage: Storage): boolean {
  try {
    storage.setItem(PROBE_KEY, "1");
    storage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

function localStore(): Storage | null {
  if (typeof window === "undefined") return null;
  if (localAvailable === false) return null;
  try {
    if (localAvailable === null) localAvailable = probe(window.localStorage);
    return localAvailable ? window.localStorage : null;
  } catch {
    localAvailable = false;
    return null;
  }
}

function sessionStore(): Storage | null {
  if (typeof window === "undefined") return null;
  if (sessionAvailable === false) return null;
  try {
    if (sessionAvailable === null) sessionAvailable = probe(window.sessionStorage);
    return sessionAvailable ? window.sessionStorage : null;
  } catch {
    sessionAvailable = false;
    return null;
  }
}

export function sessionGet(key: string): string | null {
  try {
    return sessionStore()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function sessionSet(key: string, value: string): boolean {
  const store = sessionStore();
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function sessionRemove(key: string) {
  try {
    sessionStore()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Durable device storage for PWA cold starts. Falls back to sessionStorage. */
export function persistGet(key: string): string | null {
  try {
    const local = localStore()?.getItem(key) ?? null;
    if (local != null) return local;
  } catch {
    /* ignore */
  }
  const session = sessionGet(key);
  if (session == null) return null;
  persistSet(key, session);
  return session;
}

export function persistSet(key: string, value: string): boolean {
  const local = localStore();
  if (local) {
    try {
      local.setItem(key, value);
      sessionRemove(key);
      return true;
    } catch {
      /* quota / SecurityError */
    }
  }
  return sessionSet(key, value);
}

export function persistRemove(key: string) {
  try {
    localStore()?.removeItem(key);
  } catch {
    /* ignore */
  }
  sessionRemove(key);
}
