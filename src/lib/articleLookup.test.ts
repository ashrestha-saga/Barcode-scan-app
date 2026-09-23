import { describe, expect, it } from "vitest";
import { UDI_5001730, UDI_500861 } from "@/constants/barcodeMap";
import {
  lookupValueForKey,
  normalizeScannedCode,
} from "@/lib/articleLookup";
import { mapShopArticleToProduct } from "@/services/articleMapper";

describe("normalizeScannedCode", () => {
  it("keeps EAN-13 digits", () => {
    expect(normalizeScannedCode(" 4006144615694 ")).toBe("4006144615694");
  });

  it("strips GTIN-14 leading zero", () => {
    expect(normalizeScannedCode("04006144615694")).toBe("4006144615694");
  });

  it("extracts GTIN from concatenated UDI with unpadded EAN-13", () => {
    expect(normalizeScannedCode("0142623645301281726082610LOT20260827")).toBe(
      "4262364530128",
    );
    expect(normalizeScannedCode(UDI_500861)).toBe("4262364530128");
  });

  it("extracts GTIN-14 from GS1-128 including AIM prefix", () => {
    expect(normalizeScannedCode(UDI_5001730)).toBe("30888277436408");
    expect(normalizeScannedCode(`]C1${UDI_5001730}`)).toBe("30888277436408");
  });
});

describe("lookupValueForKey", () => {
  it("uses normalized EAN/GTIN for oxean lookups", () => {
    expect(lookupValueForKey("4006144615694", "oxean")).toBe("4006144615694");
    expect(lookupValueForKey(UDI_500861, "oxean")).toBe("4262364530128");
    expect(lookupValueForKey(UDI_5001730, "oxean")).toBe("30888277436408");
  });

  it("keeps article numbers as entered for oxartnum", () => {
    expect(lookupValueForKey("VA-170520", "oxartnum")).toBe("VA-170520");
    expect(lookupValueForKey("1705205501", "oxartnum")).toBe("1705205501");
  });
});

describe("mapShopArticleToProduct", () => {
  it("maps shop fields used on the product sheet", () => {
    const product = mapShopArticleToProduct(
      {
        oxid: "a1b2c3d4e5f678901234567890abcdef",
        oxartnum: "1705205501",
        oxtitle: "SCHMITZ varimed Untersuchungsliege",
        oxshortdesc: "Polster classic, silbergrau",
        oxprice: "417",
        oxean: "",
        oxunitname: "Stück",
        oxunitquantity: "1",
        oxvpe: "0",
        oxstock: -1,
        oxvarselect: "grauweiß RAL 9002 | classic, silbergrau",
      },
      "4006144615694",
    );
    expect(product?.oxid).toBe("a1b2c3d4e5f678901234567890abcdef");
    expect(product?.sku).toBe("1705205501");
    expect(product?.name).toContain("Untersuchungsliege");
    expect(product?.price).toBe(417);
    expect(product?.gtin).toBe("4006144615694");
    expect(product?.min).toBe(1);
    expect(product?.stock).toContain("Auf Lager");
  });
});
