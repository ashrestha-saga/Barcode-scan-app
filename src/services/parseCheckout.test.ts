import { describe, expect, it } from "vitest";
import {
  extractCheckoutError,
  parseShopCartResponse,
  parseSubmitOrderResponse,
} from "@/services/parseCheckout";

describe("parseShopCartResponse", () => {
  it("parses shop getcart shape { success, cart: { items } }", () => {
    const lines = parseShopCartResponse({
      success: true,
      cart: {
        items: [
          {
            id: "510b637ccb7a2a06b67164f6862e9a4a",
            articleId: "008075abb02f79ca99e420c1e4277ffa",
            artnum: "710751",
            title: "AFIAS PCT Kontrollkit",
            amount: 3,
            unitNetPrice: 24.9,
            unitGrossPrice: 29.63,
            lineNetPrice: 74.7,
            lineGrossPrice: 88.89,
          },
        ],
      },
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      id: "510b637ccb7a2a06b67164f6862e9a4a",
      artnum: "710751",
      amount: 3,
      title: "AFIAS PCT Kontrollkit",
      price: 24.9,
    });
  });
});

describe("parseSubmitOrderResponse", () => {
  it("reads order.number from submitorder success payload", () => {
    const submitted = parseSubmitOrderResponse({
      status: "success",
      data: {
        success: true,
        order: {
          id: "eb7f09688590f7085c498689f3b09cc4",
          number: "24694",
          createdAt: "2026-09-03T12:32:27+02:00",
          childUserId: "e8d3073472958653dc46b1b769fb3264",
        },
      },
    });
    expect(submitted).toEqual({
      number: "24694",
      id: "eb7f09688590f7085c498689f3b09cc4",
      createdAt: "2026-09-03T12:32:27+02:00",
      childUserId: "e8d3073472958653dc46b1b769fb3264",
    });
  });
});

describe("extractCheckoutError", () => {
  it("reads nested error.message from shop 422 payload", () => {
    expect(
      extractCheckoutError(
        {
          success: false,
          error: {
            code: "BELOW_MIN_ORDER_VALUE",
            message: "The basket total is below the minimum order value.",
          },
        },
        "fallback",
      ),
    ).toBe("Der Warenkorb liegt unter dem Mindestbestellwert.");
  });
});

describe("parseValidatePinResponse", () => {
  it("reads child from validatepin success payload", async () => {
    const {
      parseValidatePinResponse,
      validatedChildDisplayName,
    } = await import("@/services/parseCheckout");
    const child = parseValidatePinResponse({
      success: true,
      child: {
        oxid: "abc123",
        salutation: "MR",
        first_name: "Anna",
        last_name: "Mustermann",
        custnr: "10002",
      },
    });
    expect(child).toEqual({
      oxid: "abc123",
      salutation: "MR",
      first_name: "Anna",
      last_name: "Mustermann",
      custnr: "10002",
    });
    expect(validatedChildDisplayName(child!)).toBe("Herr Anna Mustermann");
  });
});
