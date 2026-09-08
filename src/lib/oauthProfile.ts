import type { OAuthAddress, OAuthProfile } from "@/interfaces/auth";
import type { ShippingAddress } from "@/interfaces/domain";

function text(value: string | undefined): string {
  return value?.trim() ?? "";
}

function formatAddress(addr: OAuthAddress | undefined): string {
  if (!addr) return "";
  const street = [text(addr.street), text(addr.street_no)].filter(Boolean).join(" ");
  const city = [text(addr.zip), text(addr.city)].filter(Boolean).join(" ");
  return [street, city, text(addr.addinfo)].filter(Boolean).join(" · ");
}

function formatSalutation(salutation: string): string {
  if (!salutation) return "";
  const key = salutation.trim().toUpperCase();
  const labels: Record<string, string> = {
    MR: "Herr",
    MRS: "Frau",
    MS: "Frau",
  };
  return labels[key] ?? salutation.trim();
}

function addressPersonName(addr?: OAuthAddress): string {
  if (!addr) return "";
  return [
    formatSalutation(text(addr.salutation)),
    text(addr.first_name),
    text(addr.last_name),
  ]
    .filter(Boolean)
    .join(" ");
}

function formatShipLine(input: {
  name: string;
  company: string;
  site: string;
}): string {
  return [input.name, input.company, input.site].filter(Boolean).join(" · ");
}

function shippingAddressId(addr: OAuthAddress | undefined, fallback: string): string {
  return text(addr?.oxid) || fallback;
}

export const EMPTY_SHIPPING_ADDRESS: ShippingAddress = {
  id: "—",
  custnr: "—",
  name: "",
  company: "",
  site: "",
  ship: "",
};

export function profileDisplayName(profile: OAuthProfile): string {
  return [
    formatSalutation(text(profile.salutation)),
    text(profile.first_name),
    text(profile.last_name),
  ]
    .filter(Boolean)
    .join(" ");
}

export function billingCompanyFromProfile(profile: OAuthProfile): string {
  return text(profile.billing?.company);
}

export function profileUserLabel(profile: OAuthProfile): string {
  const person = [text(profile.first_name), text(profile.last_name)]
    .filter(Boolean)
    .join(" ");
  return person || text(profile.email) || "Benutzer";
}

/** Map oauthme profile delivery/billing addresses to shipping addresses for ScanOrder. */
export function shippingAddressesFromProfile(
  profile: OAuthProfile,
): ShippingAddress[] {
  const custnr = text(profile.custnr) || "—";
  const billingSite = formatAddress(profile.billing) || "Rechnungsadresse";

  const asShipping = (
    addr: OAuthAddress | undefined,
    id: string,
  ): ShippingAddress => {
    const name = addressPersonName(addr);
    const company = text(addr?.company);
    const site = formatAddress(addr) || billingSite;
    return {
      id,
      custnr,
      name,
      company,
      site,
      ship: formatShipLine({ name, company, site }),
    };
  };

  const deliveries = profile.addresses?.filter(Boolean) ?? [];
  if (deliveries.length === 0) {
    return [
      asShipping(profile.billing, shippingAddressId(profile.billing, custnr)),
    ];
  }
  if (deliveries.length === 1) {
    return [
      asShipping(deliveries[0], shippingAddressId(deliveries[0], custnr)),
    ];
  }
  return deliveries.map((addr, i) =>
    asShipping(addr, shippingAddressId(addr, String(i))),
  );
}
