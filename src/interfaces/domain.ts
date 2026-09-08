export type ExpiryLevel = "ok" | "warn" | "bad";

export type LotState = ExpiryLevel;

export type UnitKind = "stk" | "vpe";

export type SheetKind =
  | "product"
  | "manual"
  | "unknown"
  | null;

export type FullView =
  | "cart"
  | "conflict"
  | "done"
  | "outbox"
  | null;

export type AuthStep =
  | "credentials"
  | "childPin"
  | "basketChoice"
  | "shipping"
  | "reauth"
  | null;

export type OutboxState =
  | "pending"
  | "syncing"
  | "sent"
  | "confirmed"
  | "retry"
  | "failed"
  | "blocked"
  | "waiting";

/** Selected ship-to address from the OAuth profile (not a child user account). */
export interface ShippingAddress {
  /** OXID delivery address id — sent as `delivery_address_id` on submit. */
  id: string;
  /** Customer number from the shop profile. */
  custnr: string;
  /** Person name from the address (first + last). */
  name: string;
  /** Company name from the address, if any. */
  company: string;
  site: string;
  ship: string;
}

export interface ProductUnit {
  kind: UnitKind;
  label: string;
  factor: number;
  subtitle: string;
}

export interface Product {
  sku: string;
  init: string;
  name: string;
  gtin: string;
  sym: string;
  price: number;
  vpe: number;
  vpeName: string;
  min: number;
  stock: string;
  udi?: boolean;
  lotPrefix?: string;
  serial?: string | null;
}

export interface Gs1Ai {
  ai: string;
  val: string;
  name: string;
  part: "DI" | "PI";
}

export interface LotInfo {
  lot: string;
  expiry: Date | null;
  serial: string | null;
  raw: string;
  ais: Gs1Ai[];
}

export interface CartItem {
  id: string;
  sku: string;
  name: string;
  init: string;
  qty: number;
  unit: UnitKind;
  unitLabel: string;
  unitFactor: number;
  unitPrice: number;
  lineTotal: number;
  gtin: string;
  lot?: string;
  expiry?: string;
  expiryLevel?: ExpiryLevel;
  serial?: string | null;
  rawUdi?: string;
  unknown?: boolean;
  unknownCode?: string;
}

export interface OutboxEntry {
  id: string;
  no: string;
  n: number;
  sum: number;
  state: OutboxState;
  request: boolean;
  idempotencyKey: string;
  createdAt: string;
  customerId: string;
}

export interface DoneRecap {
  no: string;
  request: boolean;
  n: number;
  sum: number;
  custnr: string;
  /** Shipping address person name (with salutation). */
  name: string;
  /** Shipping address company, if any. */
  company: string;
  /** Shipping address site (street, city). */
  site: string;
  userLabel: string;
  roleLabel: string;
  /** pending = undo window; submitting = API in flight; success/failed = final. */
  status: "pending" | "submitting" | "success" | "failed";
  error?: string;
}

export interface PriceDiff {
  sku: string;
  name: string;
  oldPrice: number;
  newPrice: number;
  pct: number;
}
