import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CartItem, OutboxEntry } from "@/interfaces/domain";

interface ScanOrderDB extends DBSchema {
  meta: {
    key: string;
    value: unknown;
  };
  cart: {
    key: string;
    value: { id: string; items: CartItem[]; customerId: string | null; updatedAt: string };
  };
  outbox: {
    key: string;
    value: OutboxEntry;
  };
}

const DB_NAME = "scanorder";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ScanOrderDB>> | null = null;

function getDb() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is browser-only"));
  }
  if (!dbPromise) {
    dbPromise = openDB<ScanOrderDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
        if (!db.objectStoreNames.contains("cart")) db.createObjectStore("cart");
        if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export interface PersistedSession {
  authed: boolean;
  shippingAddressIdx: number;
  /** @deprecated migrated to shippingAddressIdx */
  accountIdx?: number;
  expired: boolean;
}

export async function saveCartDraft(
  items: CartItem[],
  customerId: string | null,
) {
  const db = await getDb();
  await db.put("cart", {
    id: "draft",
    items,
    customerId,
    updatedAt: new Date().toISOString(),
  }, "draft");
}

export async function loadCartDraft() {
  const db = await getDb();
  return db.get("cart", "draft");
}

export async function saveSession(session: PersistedSession) {
  const db = await getDb();
  await db.put("meta", session, "session");
}

export async function loadSession() {
  const db = await getDb();
  return (await db.get("meta", "session")) as PersistedSession | undefined;
}

export async function saveOutbox(entries: OutboxEntry[]) {
  const db = await getDb();
  const tx = db.transaction("outbox", "readwrite");
  await tx.store.clear();
  for (const e of entries) await tx.store.put(e);
  await tx.done;
}

export async function loadOutbox() {
  const db = await getDb();
  return db.getAll("outbox");
}
