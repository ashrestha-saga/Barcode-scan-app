const DEFAULT_BASE_URL = "https://shop1.medsadba-mwv01.mhosts.de";
const OAUTH_SCOPE = "profile address api";

export function getShopBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_MED_SALES_BASE_URL ??
    process.env.MED_SALES_BASE_URL ??
    DEFAULT_BASE_URL
  ).replace(/\/$/, "");
}

export function getOAuthClientId(): string {
  return process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID?.trim() ?? "";
}

export function getOAuthClientSecret(): string {
  return process.env.OAUTH_CLIENT_SECRET?.trim() ?? "";
}

export function getOAuthScope(): string {
  return OAUTH_SCOPE;
}

export function getOAuthAuthorizeUrl(): string {
  return `${getShopBaseUrl()}/index.php?cl=oauthauthorize`;
}

export function getOAuthTokenUrl(): string {
  return `${getShopBaseUrl()}/index.php?cl=oauthtoken&fnc=token`;
}

export function getOAuthMeUrl(): string {
  return `${getShopBaseUrl()}/index.php?cl=oauthme&fnc=getProfile`;
}

export function getOAuthRevokeUrl(): string {
  return `${getShopBaseUrl()}/index.php?cl=oauthrevoke&fnc=revoke`;
}

export function getArticlesUrl(): string {
  return `${getShopBaseUrl()}/index.php?cl=articleapi&fnc=getArticles`;
}

export function getAddToCartUrl(): string {
  return `${getShopBaseUrl()}/index.php?cl=checkoutapi&fnc=addtocart`;
}

export function getCartUrl(): string {
  return `${getShopBaseUrl()}/index.php?cl=checkoutapi&fnc=getcart`;
}

export function getUpdateCartUrl(): string {
  return `${getShopBaseUrl()}/index.php?cl=checkoutapi&fnc=updatecart`;
}

export function getSubmitOrderUrl(): string {
  return `${getShopBaseUrl()}/index.php?cl=checkoutapi&fnc=submitorder`;
}

export function getValidatePinUrl(): string {
  return `${getShopBaseUrl()}/index.php?cl=checkoutapi&fnc=validatepin`;
}

export function oauthRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/auth/callback`;
}
