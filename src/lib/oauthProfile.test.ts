import { describe, expect, it } from "vitest";
import type { OAuthProfile } from "@/interfaces/auth";
import { shippingAddressesFromProfile, billingCompanyFromProfile, profileDisplayName, profileUserLabel } from "@/lib/oauthProfile";

const profile: OAuthProfile = {
  email: "max@example.com",
  first_name: "Max",
  last_name: "Mustermann",
  custnr: "10042",
  billing: {
    company: "ACME GmbH",
    first_name: "Max",
    last_name: "Mustermann",
    street: "Musterstraße",
    street_no: "42",
    zip: "80331",
    city: "München",
  },
};

describe("shippingAddressesFromProfile", () => {
  it("uses billing when there are no delivery addresses", () => {
    const shippingAddresses = shippingAddressesFromProfile(profile);
    expect(shippingAddresses).toHaveLength(1);
    expect(shippingAddresses[0].id).toBe("10042");
    expect(shippingAddresses[0].custnr).toBe("10042");
    expect(shippingAddresses[0].name).toBe("Max Mustermann");
    expect(shippingAddresses[0].company).toBe("ACME GmbH");
    expect(shippingAddresses[0].site).toContain("München");
    expect(shippingAddresses[0].ship).toContain("Max Mustermann");
  });

  it("includes salutation in the address person name", () => {
    const shippingAddresses = shippingAddressesFromProfile({
      ...profile,
      addresses: [
        {
          oxid: "addr1",
          salutation: "MRS",
          first_name: "Jenny",
          last_name: "Doe",
          street: "In der Raste",
          street_no: "14",
          zip: "53129",
          city: "Bonn",
        },
      ],
    });
    expect(shippingAddresses[0].name).toBe("Frau Jenny Doe");
    expect(shippingAddresses[0].ship).toContain("Frau Jenny Doe");
  });

  it("uses address person name and company separately for delivery addresses", () => {
    const shippingAddresses = shippingAddressesFromProfile({
      ...profile,
      addresses: [
        {
          oxid: "addr1",
          first_name: "Jenny",
          last_name: "Doe",
          company: "Merzljak Healthcare Marketing",
          street: "In der Raste",
          street_no: "14",
          zip: "53129",
          city: "Bonn",
        },
      ],
    });
    expect(shippingAddresses).toHaveLength(1);
    expect(shippingAddresses[0].id).toBe("addr1");
    expect(shippingAddresses[0].custnr).toBe("10042");
    expect(shippingAddresses[0].name).toBe("Jenny Doe");
    expect(shippingAddresses[0].company).toBe("Merzljak Healthcare Marketing");
    expect(shippingAddresses[0].site).toContain("Bonn");
    expect(shippingAddresses[0].ship).toBe(
      "Jenny Doe · Merzljak Healthcare Marketing · In der Raste 14 · 53129 Bonn",
    );
  });

  it("does not fall back to billing company for delivery address name", () => {
    const shippingAddresses = shippingAddressesFromProfile({
      ...profile,
      addresses: [
        {
          oxid: "addr1",
          first_name: "Jenny",
          last_name: "Doe",
          street: "Lieferstraße",
          street_no: "7",
          zip: "80333",
          city: "München",
        },
      ],
    });
    expect(shippingAddresses).toHaveLength(1);
    expect(shippingAddresses[0].name).toBe("Jenny Doe");
    expect(shippingAddresses[0].company).toBe("");
    expect(shippingAddresses[0].site).toContain("Lieferstraße");
  });

  it("returns one account per delivery address when several exist", () => {
    const shippingAddresses = shippingAddressesFromProfile({
      ...profile,
      addresses: [
        {
          oxid: "a",
          first_name: "A",
          last_name: "One",
          street: "A-Str",
          street_no: "1",
          zip: "1",
          city: "X",
        },
        {
          oxid: "b",
          first_name: "B",
          last_name: "Two",
          street: "B-Str",
          street_no: "2",
          zip: "2",
          city: "Y",
        },
      ],
    });
    expect(shippingAddresses).toHaveLength(2);
    expect(shippingAddresses[0].id).toBe("a");
    expect(shippingAddresses[0].custnr).toBe("10042");
    expect(shippingAddresses[0].name).toBe("A One");
    expect(shippingAddresses[1].id).toBe("b");
    expect(shippingAddresses[1].name).toBe("B Two");
  });
});

describe("profileUserLabel", () => {
  it("joins first and last name", () => {
    expect(profileUserLabel(profile)).toBe("Max Mustermann");
  });
});

describe("profileDisplayName", () => {
  it("includes salutation from the profile", () => {
    expect(
      profileDisplayName({
        ...profile,
        salutation: "MR",
      }),
    ).toBe("Herr Max Mustermann");
  });
});

describe("billingCompanyFromProfile", () => {
  it("returns the billing address company", () => {
    expect(billingCompanyFromProfile(profile)).toBe("ACME GmbH");
  });
});
