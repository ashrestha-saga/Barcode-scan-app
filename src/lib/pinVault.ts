import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface PinVaultDB extends DBSchema {
  vault: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = "scanorder-pin";
const DB_VERSION = 1;
const KEY_ID = "aes-key";
const PIN_ID = "pin-blob";

type PinBlob = {
  iv: number[];
  ciphertext: number[];
};

let dbPromise: Promise<IDBPDatabase<PinVaultDB>> | null = null;

function browser(): boolean {
  return typeof window !== "undefined" && typeof crypto !== "undefined";
}

function getDb() {
  if (!browser()) {
    return Promise.reject(new Error("PIN vault is browser-only"));
  }
  if (!dbPromise) {
    dbPromise = openDB<PinVaultDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("vault")) {
          db.createObjectStore("vault");
        }
      },
    });
  }
  return dbPromise;
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const db = await getDb();
  const raw = (await db.get("vault", KEY_ID)) as JsonWebKey | undefined;
  if (raw) {
    return crypto.subtle.importKey(
      "jwk",
      raw,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", key);
  await db.put("vault", jwk, KEY_ID);
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function saveEncryptedSessionPin(pin: string): Promise<void> {
  if (!browser()) return;
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(pin);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const blob: PinBlob = {
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(cipher)),
  };
  const db = await getDb();
  await db.put("vault", blob, PIN_ID);
}

export async function loadDecryptedSessionPin(): Promise<string | null> {
  if (!browser()) return null;
  const db = await getDb();
  const blob = (await db.get("vault", PIN_ID)) as PinBlob | undefined;
  if (!blob?.iv?.length || !blob?.ciphertext?.length) return null;
  try {
    const key = await getOrCreateKey();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(blob.iv) },
      key,
      new Uint8Array(blob.ciphertext),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

export async function hasEncryptedSessionPin(): Promise<boolean> {
  if (!browser()) return false;
  const db = await getDb();
  return Boolean(await db.get("vault", PIN_ID));
}

export async function clearEncryptedSessionPin(): Promise<void> {
  if (!browser()) return;
  const db = await getDb();
  await db.delete("vault", PIN_ID);
}
