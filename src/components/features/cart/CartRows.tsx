"use client";

import { eurUnit } from "@/lib/format";
import { useAppStore } from "@/store/appStore";

export function CartRows({ onRemove }: { onRemove: (id: string) => void }) {
  const cart = useAppStore((s) => s.cart);

  if (!cart.length) {
    return (
      <div className="so-empty">
        <strong>Noch keine Positionen</strong>
        <p>Scannen Sie einen Barcode oder geben Sie GTIN/SKU manuell ein.</p>
      </div>
    );
  }

  return (
    <>
      {cart.map((item) => (
        <div className="so-item" key={item.id}>
          <div>
            <div className="so-inm">{item.name}</div>
            <div className="so-isub">
              Art.Nr.: {item.sku}
              {item.lot ? ` · Charge ${item.lot}` : ""}
              {item.expiry ? ` · VHD ${item.expiry}` : ""}
              {` · ${eurUnit(item.unitPrice)}`}
            </div>
          </div>
          <div className="so-iqty">
            {item.qty} {item.unitLabel}
          </div>
          <button
            type="button"
            className="so-del"
            aria-label="Entfernen"
            onClick={() => onRemove(item.id)}
          >
            ×
          </button>
        </div>
      ))}
    </>
  );
}
