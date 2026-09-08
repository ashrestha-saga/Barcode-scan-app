import type { CartItem, Product, UnitKind } from "@/interfaces/domain";
import { newId } from "@/lib/format";

export function unitFactor(product: Product, unit: UnitKind): number {
  return unit === "vpe" ? product.vpe : 1;
}

export function unitLabel(product: Product, unit: UnitKind): string {
  return unit === "vpe" ? product.vpeName : "Stück";
}

export function lineTotal(
  product: Product,
  qty: number,
  unit: UnitKind,
): number {
  return product.price * qty * unitFactor(product, unit);
}

export function cartTotals(items: CartItem[]): { n: number; sum: number } {
  return items.reduce(
    (acc, item) => ({
      n: acc.n + 1,
      sum: acc.sum + item.lineTotal,
    }),
    { n: 0, sum: 0 },
  );
}

export function mergeKey(item: {
  sku: string;
  lot?: string;
  serial?: string | null;
  unknown?: boolean;
  unknownCode?: string;
}): string {
  if (item.unknown) return `unknown:${item.unknownCode ?? ""}`;
  return `${item.sku}|${item.lot ?? ""}|${item.serial ?? ""}`;
}

export function findMergeIndex(
  cart: CartItem[],
  candidate: {
    sku: string;
    lot?: string;
    serial?: string | null;
    unknown?: boolean;
    unknownCode?: string;
  },
): number {
  const key = mergeKey(candidate);
  return cart.findIndex((c) => mergeKey(c) === key);
}

export function buildCartItem(
  product: Product,
  qty: number,
  unit: UnitKind,
  extras?: Partial<
    Pick<
      CartItem,
      | "lot"
      | "expiry"
      | "expiryLevel"
      | "serial"
      | "rawUdi"
      | "unknown"
      | "unknownCode"
    >
  >,
): CartItem {
  const factor = unitFactor(product, unit);
  return {
    id: newId(),
    sku: product.sku,
    name: product.name,
    init: product.init,
    qty,
    unit,
    unitLabel: unitLabel(product, unit),
    unitFactor: factor,
    unitPrice: product.price,
    lineTotal: product.price * qty * factor,
    gtin: product.gtin,
    ...extras,
  };
}

export function incrementCartItem(
  item: CartItem,
  addQty: number,
  unitPrice: number,
): CartItem {
  const qty = item.qty + addQty;
  return {
    ...item,
    qty,
    lineTotal: unitPrice * qty * item.unitFactor,
  };
}
