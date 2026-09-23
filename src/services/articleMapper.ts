import type { ShopArticle } from "@/interfaces/article";
import type { Product } from "@/interfaces/domain";

function num(value: string | number | undefined, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function text(value: string | undefined): string {
  return value?.trim() ?? "";
}

function initials(title: string): string {
  const parts = title.split(/\s+/).filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return letters.slice(0, 2) || "AR";
}

function stockLabel(article: ShopArticle): string {
  const stock = num(article.oxstock, 0);
  const custom = text(article.oxstocktext);
  if (custom) return custom;
  if (stock < 0) return "Auf Lager";
  if (stock === 0) return text(article.oxnostocktext) || "Nicht auf Lager";
  return `Auf Lager · ${stock} Stück`;
}

/** Map shop getArticles row → scan product sheet. */
export function mapShopArticleToProduct(
  article: ShopArticle,
  scannedCode?: string,
): Product | null {
  const sku = text(article.oxartnum) || text(article.az_catalog_nr);
  const name = text(article.oxtitle);
  if (!sku || !name) return null;

  const vpeRaw = num(article.oxvpe, 0);
  const vpe = vpeRaw > 1 ? vpeRaw : 1;
  const unitName = text(article.oxunitname) || "Stück";
  const gtin =
    text(article.oxean) ||
    text(article.gtin) ||
    text(article.oxdistean) ||
    (scannedCode && /^\d{8,14}$/.test(scannedCode.replace(/\D/g, ""))
      ? scannedCode.replace(/\D/g, "").replace(/^0(?=\d{13}$)/, "")
      : "") ||
    sku;

  const extra = [text(article.oxvarselect), text(article.oxshortdesc)]
    .filter(Boolean)
    .join(" · ");

  const oxid = text(article.oxid);

  return {
    ...(oxid ? { oxid } : {}),
    sku,
    init: initials(name),
    name,
    gtin,
    sym: /^\d{8,14}$/.test(gtin) ? "EAN-13" : "SKU",
    price: num(article.oxprice, 0),
    vpe,
    vpeName: vpe > 1 ? `VPE à ${vpe}` : unitName,
    min: Math.max(1, num(article.oxunitquantity, 1)),
    stock: extra ? `${stockLabel(article)} · ${extra}` : stockLabel(article),
  };
}
