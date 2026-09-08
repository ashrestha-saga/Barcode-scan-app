import type { CartItem } from "@/interfaces/domain";

export type ShopCartLine = {
  id: string;
  artnum: string;
  amount: number;
  title?: string;
  price?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function parseCartLine(row: unknown): ShopCartLine | null {
  const obj = asRecord(row);
  if (!obj) return null;
  const id =
    (typeof obj.id === "string" && obj.id) ||
    (typeof obj.oxid === "string" && obj.oxid) ||
    (typeof obj.basketitemid === "string" && obj.basketitemid) ||
    "";
  const artnum =
    (typeof obj.artnum === "string" && obj.artnum) ||
    (typeof obj.oxartnum === "string" && obj.oxartnum) ||
    (typeof obj.sku === "string" && obj.sku) ||
    "";
  const amount = readAmount(obj.amount ?? obj.qty ?? obj.oxamount);
  if (!id || !artnum || !Number.isFinite(amount) || amount <= 0) return null;
  const title =
    (typeof obj.title === "string" && obj.title) ||
    (typeof obj.oxtitle === "string" && obj.oxtitle) ||
    (typeof obj.name === "string" && obj.name) ||
    undefined;
  const priceRaw = readAmount(
    obj.unitNetPrice ?? obj.price ?? obj.oxprice ?? obj.unitPrice,
  );
  return {
    id,
    artnum: artnum.trim(),
    amount: Math.floor(amount),
    title,
    price: Number.isFinite(priceRaw) ? priceRaw : undefined,
  };
}

/** Collect a candidate items array from a response object. */
function itemsFromContainer(container: Record<string, unknown>): unknown[] | null {
  for (const key of ["items", "articles", "basket", "contents"]) {
    const val = container[key];
    if (Array.isArray(val)) return val;
  }
  // Shop getcart: { success: true, cart: { items: [...] } }
  const cart = asRecord(container.cart);
  if (cart && Array.isArray(cart.items)) return cart.items;
  return null;
}

function findItemsArray(payload: unknown): unknown[] {
  const root = asRecord(payload);
  if (!root) return [];

  const fromRoot = itemsFromContainer(root);
  if (fromRoot) return fromRoot;

  const data = asRecord(root.data);
  if (data) {
    const fromData = itemsFromContainer(data);
    if (fromData) return fromData;
  }

  if (Array.isArray(root.data)) return root.data;
  return [];
}

export function parseShopCartResponse(payload: unknown): ShopCartLine[] {
  return findItemsArray(payload)
    .map(parseCartLine)
    .filter((row): row is ShopCartLine => row !== null);
}

export function extractCheckoutError(payload: unknown, fallback: string): string {
  const obj = asRecord(payload);
  if (!obj) return fallback;

  const nestedError = asRecord(obj.error);
  if (nestedError) {
    const code = typeof nestedError.code === "string" ? nestedError.code : "";
    const message =
      typeof nestedError.message === "string" ? nestedError.message.trim() : "";
    if (code === "BELOW_MIN_ORDER_VALUE") {
      return "Der Warenkorb liegt unter dem Mindestbestellwert.";
    }
    if (message) return message;
    if (code) return code;
  }

  for (const key of ["error_description", "message", "error"]) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  const data = asRecord(obj.data);
  if (data) {
    const dataErr = asRecord(data.error);
    if (dataErr) {
      const message =
        typeof dataErr.message === "string" ? dataErr.message.trim() : "";
      if (message) return message;
    }
    for (const key of ["error_description", "message", "error"]) {
      const val = data[key];
      if (typeof val === "string" && val.trim()) return val.trim();
    }
  }
  return fallback;
}

export type SubmittedOrder = {
  id?: string;
  number: string;
  createdAt?: string;
  childUserId?: string;
};

export type ValidatedChild = {
  oxid: string;
  salutation?: string;
  first_name?: string;
  last_name?: string;
  custnr?: string;
};

function childSalutationLabel(salutation: string | undefined): string {
  if (!salutation) return "";
  const key = salutation.trim().toUpperCase();
  const labels: Record<string, string> = {
    MR: "Herr",
    MRS: "Frau",
    MS: "Frau",
  };
  return labels[key] ?? salutation.trim();
}

/** Display name for status / recap (e.g. "Herr Ray Victor"). */
export function validatedChildDisplayName(child: ValidatedChild): string {
  return [
    childSalutationLabel(child.salutation),
    child.first_name?.trim() ?? "",
    child.last_name?.trim() ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Short label without salutation (e.g. "Ray Victor"). */
export function validatedChildUserLabel(child: ValidatedChild): string {
  return [child.first_name?.trim() ?? "", child.last_name?.trim() ?? ""]
    .filter(Boolean)
    .join(" ");
}

function parseChildBlock(raw: unknown): ValidatedChild | null {
  const child = asRecord(raw);
  if (!child) return null;
  const oxid =
    (typeof child.oxid === "string" && child.oxid.trim()) ||
    (typeof child.id === "string" && child.id.trim()) ||
    "";
  if (!oxid) return null;
  return {
    oxid,
    salutation:
      typeof child.salutation === "string" ? child.salutation : undefined,
    first_name:
      typeof child.first_name === "string" ? child.first_name : undefined,
    last_name: typeof child.last_name === "string" ? child.last_name : undefined,
    custnr: typeof child.custnr === "string" ? child.custnr : undefined,
  };
}

/** Parse validatepin success → child identity unlocked by the PIN. */
export function parseValidatePinResponse(payload: unknown): ValidatedChild | null {
  const root = asRecord(payload);
  if (!root) return null;

  if (root.success === false) return null;
  if (typeof root.status === "string" && root.status !== "success") return null;

  const direct = parseChildBlock(root.child);
  if (direct) return direct;

  const data = asRecord(root.data);
  if (data) {
    if (data.success === false) return null;
    const nested = parseChildBlock(data.child);
    if (nested) return nested;
  }
  return null;
}

function readOrderNumber(order: Record<string, unknown>): string | null {
  const raw = order.number ?? order.oxordernr ?? order.orderNumber;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return null;
}

function findOrderBlock(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload);
  if (!root) return null;

  const direct = asRecord(root.order);
  if (direct) return direct;

  const data = asRecord(root.data);
  if (data) {
    const nested = asRecord(data.order);
    if (nested) return nested;
    const deeper = asRecord(data.data);
    if (deeper) {
      const inner = asRecord(deeper.order);
      if (inner) return inner;
    }
  }
  return null;
}

/** Parse submitorder success payload → order number for the done screen. */
export function parseSubmitOrderResponse(payload: unknown): SubmittedOrder | null {
  const order = findOrderBlock(payload);
  if (!order) return null;
  const number = readOrderNumber(order);
  if (!number) return null;
  return {
    number,
    id: typeof order.id === "string" ? order.id : undefined,
    createdAt: typeof order.createdAt === "string" ? order.createdAt : undefined,
    childUserId:
      typeof order.childUserId === "string" ? order.childUserId : undefined,
  };
}

/** Map shop basket lines into local cart items (merge source). */
export function shopCartToLocalItems(lines: ShopCartLine[]): CartItem[] {
  return lines.map((line) => {
    const price = line.price ?? 0;
    const name = line.title?.trim() || line.artnum;
    return {
      id: `shop-${line.id}`,
      sku: line.artnum,
      name,
      init: name.slice(0, 2).toUpperCase(),
      qty: line.amount,
      unit: "stk" as const,
      unitLabel: "Stück",
      unitFactor: 1,
      unitPrice: price,
      lineTotal: price * line.amount,
      gtin: "",
    };
  });
}
