import { describe, expect, it } from "vitest";
import type { Product } from "@/interfaces/domain";
import { buildCartItem, findMergeIndex, incrementCartItem } from "@/lib/cart";
import { expiryLevel } from "@/lib/expiry";
import { fromYYMMDD, lotInfoFromScan, parseGS1, yymmdd } from "@/lib/gs1";

const product: Product = {
  sku: "VA-204118",
  init: "NH",
  name: "Gloves",
  gtin: "04250098722104",
  sym: "GS1-128",
  price: 0.089,
  vpe: 100,
  vpeName: "Box",
  min: 100,
  stock: "Auf Lager",
  udi: true,
  lotPrefix: "NH",
};

describe("parseGS1", () => {
  it("parses fixed and variable AIs", () => {
    const raw = `01042500987221041725010110LOT123\u001D21SN9`;
    const ais = parseGS1(raw);
    expect(ais.map((a) => a.ai)).toEqual(["01", "17", "10", "21"]);
    expect(ais.find((a) => a.ai === "01")?.val).toBe("04250098722104");
    expect(ais.find((a) => a.ai === "10")?.val).toBe("LOT123");
    expect(ais.find((a) => a.ai === "21")?.val).toBe("SN9");
  });

  it("parses concatenated UDI with unpadded EAN-13 in AI 01", () => {
    const raw = "0142623645301281726082610LOT20260827";
    const ais = parseGS1(raw);
    expect(ais.map((a) => a.ai)).toEqual(["01", "17", "10"]);
    expect(ais.find((a) => a.ai === "01")?.val).toBe("04262364530128");
    expect(ais.find((a) => a.ai === "17")?.val).toBe("260826");
    expect(ais.find((a) => a.ai === "10")?.val).toBe("LOT20260827");
  });

  it("parses parenthesized UDI and symbology prefix", () => {
    const raw = "]d2(01)04250098722104(17)250101(10)LOT123(21)SN9";
    const ais = parseGS1(raw);
    expect(ais.map((a) => a.ai)).toEqual(["01", "17", "10", "21"]);
    expect(ais.find((a) => a.ai === "01")?.val).toBe("04250098722104");
  });

  it("parses GS1-128 UDI with GTIN-14 indicator digit 3", () => {
    const raw = "01308882774364081727112810ZIM24W49";
    const ais = parseGS1(raw);
    expect(ais.map((a) => a.ai)).toEqual(["01", "17", "10"]);
    expect(ais.find((a) => a.ai === "01")?.val).toBe("30888277436408");
    expect(ais.find((a) => a.ai === "17")?.val).toBe("271128");
    expect(ais.find((a) => a.ai === "10")?.val).toBe("ZIM24W49");
    expect(parseGS1("(01)30888277436408(17)271128(10)ZIM24W49")).toEqual(ais);
  });
});

describe("lotInfoFromScan", () => {
  it("keeps live lot/expiry/serial from a GS1 payload", () => {
    const raw = "01042500987221041726082410AB12\u001D21SN1";
    const lot = lotInfoFromScan(raw);
    expect(lot?.lot).toBe("AB12");
    expect(lot?.serial).toBe("SN1");
    expect(lot?.expiry).toEqual(fromYYMMDD("260824"));
  });

  it("returns null for a plain EAN-13", () => {
    expect(lotInfoFromScan("4006144615694")).toBeNull();
  });

  it("reads live lot from concatenated GS1 without parentheses", () => {
    const lot = lotInfoFromScan("0142623645301281726082610LOT20260827");
    expect(lot?.lot).toBe("LOT20260827");
    expect(lot?.expiry).toEqual(fromYYMMDD("260826"));
  });
});

describe("expiryLevel", () => {
  it("classifies ok / warn / bad", () => {
    const now = new Date("2026-08-24");
    expect(expiryLevel(new Date("2027-08-24"), now)).toBe("ok");
    expect(expiryLevel(new Date("2026-09-20"), now)).toBe("warn");
    expect(expiryLevel(new Date("2026-08-01"), now)).toBe("bad");
  });
});

describe("cart merge", () => {
  it("merges same sku without lot", () => {
    const a = buildCartItem(product, 100, "stk");
    const b = buildCartItem(product, 100, "stk");
    const idx = findMergeIndex([a], b);
    expect(idx).toBe(0);
    const merged = incrementCartItem(a, 100, product.price);
    expect(merged.qty).toBe(200);
  });

  it("keeps different lots separate", () => {
    const a = buildCartItem(product, 100, "stk", { lot: "A" });
    const b = buildCartItem(product, 100, "stk", { lot: "B" });
    expect(findMergeIndex([a], b)).toBe(-1);
  });
});

describe("yymmdd", () => {
  it("formats dates", () => {
    expect(yymmdd(new Date(2026, 7, 24))).toBe("260824");
  });
});
