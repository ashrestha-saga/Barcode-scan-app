/** Shop getArticles lookup field (request body key). */
export type ArticleLookupKey =
  | "oxid"
  | "oxartnum"
  | "oxean"
  | "oxdistean"
  | "oxmpn"
  | "gtin";

/** Manual entry: EAN barcode or shop article number. */
export type ManualLookupMode = Extract<ArticleLookupKey, "oxean" | "oxartnum">;

/** POST body for articleapi getArticles — one lookup key with id list. */
export type GetArticlesRequest = {
  [K in ArticleLookupKey]?: string[];
};

/** OXID article row from getArticles (fields we use). */
export interface ShopArticle {
  oxid?: string;
  oxartnum?: string;
  az_catalog_nr?: string;
  oxtitle?: string;
  oxshortdesc?: string;
  oxvarselect?: string;
  oxprice?: string | number;
  oxbprice?: string | number;
  oxean?: string;
  oxdistean?: string;
  oxmpn?: string;
  gtin?: string;
  oxunitname?: string;
  oxunitquantity?: string | number;
  oxvpe?: string | number;
  oxstock?: string | number;
  oxstockflag?: string;
  oxstocktext?: string;
  oxnostocktext?: string;
  oxpic1?: string;
  oxactive?: string;
}

export interface GetArticlesApiResponse {
  status: "success" | string;
  data?: ShopArticle[];
  errors?: unknown[];
  message?: string;
  error?: string;
}
