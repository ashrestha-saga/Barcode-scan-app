"use client";

import { ORDER_ROLE } from "@/constants/roles";
import { useAppStore } from "@/store/appStore";

export function ShippingAddressSelect() {
  const shippingAddresses = useAppStore((s) => s.shippingAddresses);
  const shippingAddressIdx = useAppStore((s) => s.shippingAddressIdx);
  const setShippingAddressIdx = useAppStore((s) => s.setShippingAddressIdx);
  const confirmShippingAddress = useAppStore((s) => s.confirmShippingAddress);

  return (
    <>
      <h3>Lieferadresse wählen</h3>
      <p className="so-lead">
        Ihr Zugang ist mehreren Lieferadressen zugeordnet. Die Auswahl bestimmt
        den Lieferort für diesen Auftrag.
      </p>
      {shippingAddresses.map((a, i) => (
        <button
          key={a.id}
          type="button"
          className="so-acc"
          aria-pressed={shippingAddressIdx === i}
          onClick={() => setShippingAddressIdx(i)}
        >
          <span className="so-an">{a.name || "Lieferadresse"}</span>
          <span className="so-ad">
            {a.company ? (
              <>
                {a.company}
                <br />
              </>
            ) : null}
            Kundennummer {a.custnr} · {a.site}
          </span>
          <span className="so-ar">{ORDER_ROLE.label}</span>
        </button>
      ))}
      <button
        type="button"
        className="so-cta so-cta--block"
        disabled={!shippingAddresses.length}
        onClick={() => confirmShippingAddress()}
      >
        Übernehmen und scannen
      </button>
      <div className="so-authnote">{ORDER_ROLE.note}</div>
    </>
  );
}
