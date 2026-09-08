"use client";

import { useShallow } from "zustand/react/shallow";
import { ORDER_ROLE } from "@/constants/roles";
import { eur } from "@/lib/format";
import {
  selectTotals,
  useAppStore,
} from "@/store/appStore";

export function BottomBar() {
  const totals = useAppStore(useShallow(selectTotals));
  const cart = useAppStore((s) => s.cart);
  const openCart = useAppStore((s) => s.openCart);
  const requestSubmit = useAppStore((s) => s.requestSubmit);
  const online = useAppStore((s) => s.online);
  const authed = useAppStore((s) => s.authed);

  return (
    <div className="so-bottombar">
      <button
        type="button"
        className="so-sum"
        onClick={() => openCart()}
        style={{ background: "transparent", border: 0, color: "inherit", textAlign: "left", cursor: "pointer", padding: 0 }}
      >
        <div className="so-k">Warenkorb</div>
        <div className="so-v">
          {eur(totals.sum)}
          <em>
            {totals.n} Position{totals.n === 1 ? "" : "en"}
          </em>
        </div>
      </button>
      <button
        type="button"
        className="so-cta"
        disabled={!cart.length || !authed}
        onClick={() => {
          if (typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches) {
            requestSubmit();
          } else {
            openCart();
          }
        }}
      >
        {!online && cart.length ? "Outbox / Prüfen" : ORDER_ROLE.cta}
      </button>
    </div>
  );
}
