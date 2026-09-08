import { describe, expect, it } from "vitest";
import type { CartItem } from "@/interfaces/domain";
import { cartItemsToAddToCartLines } from "@/services/checkoutService";

function item(partial: Partial<CartItem> & Pick<CartItem, "sku" | "qty">): CartItem {
  return {
    id: "1",
    name: "Test",
    init: "T",
    unit: "stk",
    unitLabel: "Stück",
    unitFactor: 1,
    unitPrice: 1,
    lineTotal: partial.qty,
    gtin: "",
    ...partial,
  };
}

describe("cartItemsToAddToCartLines", () => {
  it("maps qty as amount only", () => {
    expect(
      cartItemsToAddToCartLines([
        item({ sku: "2102", qty: 3, unitFactor: 10 }),
      ]),
    ).toEqual([{ artnum: "2102", amount: 3 }]);
  });

  it("merges same sku quantities", () => {
    expect(
      cartItemsToAddToCartLines([
        item({ id: "a", sku: "2102", qty: 1 }),
        item({ id: "b", sku: "2102", qty: 2 }),
        item({ id: "c", sku: "3788", qty: 5 }),
      ]),
    ).toEqual([
      { artnum: "2102", amount: 3 },
      { artnum: "3788", amount: 5 },
    ]);
  });

  it("skips unknown lines", () => {
    expect(
      cartItemsToAddToCartLines([
        item({ sku: "2102", qty: 1 }),
        item({ sku: "x", qty: 9, unknown: true, unknownCode: "x" }),
      ]),
    ).toEqual([{ artnum: "2102", amount: 1 }]);
  });
});
