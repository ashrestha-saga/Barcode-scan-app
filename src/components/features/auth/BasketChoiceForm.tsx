"use client";

import { eur } from "@/lib/format";
import { useAppStore } from "@/store/appStore";

export function BasketChoiceForm() {
  const shopBasket = useAppStore((s) => s.shopBasket);
  const authLoading = useAppStore((s) => s.authLoading);
  const authError = useAppStore((s) => s.authError);
  const mergeShopBasket = useAppStore((s) => s.mergeShopBasket);
  const clearShopBasketChoice = useAppStore((s) => s.clearShopBasketChoice);
  const runBasketCheck = useAppStore((s) => s.runBasketCheck);

  if (authLoading && !shopBasket.length) {
    return (
      <>
        <h3>Warenkorb wird geprüft</h3>
        <p className="so-lead">
          Vorhandene Positionen im Shop-Warenkorb werden geladen…
        </p>
        <div className="so-authnote">Einen Moment bitte</div>
      </>
    );
  }

  const totalQty = shopBasket.reduce((n, i) => n + i.amount, 0);
  const totalSum = shopBasket.reduce(
    (sum, i) => sum + (i.price ?? 0) * i.amount,
    0,
  );
  const hasPrices = shopBasket.some((i) => typeof i.price === "number");

  if (!shopBasket.length) {
    return (
      <>
        <h3>Warenkorb</h3>
        <p className="so-lead">
          Der Shop-Warenkorb konnte nicht geladen werden oder ist leer.
        </p>
        {authError ? (
          <div className="so-auth-error" role="alert">
            {authError}
          </div>
        ) : null}
        <button
          type="button"
          className="so-cta so-cta--block"
          disabled={authLoading}
          onClick={() => void runBasketCheck()}
        >
          Erneut prüfen
        </button>
      </>
    );
  }

  return (
    <>
      <h3>Vorhandener Warenkorb</h3>
      <p className="so-lead">
        Im Shop liegen bereits Positionen. Übernehmen Sie diese in die App oder
        leeren Sie den Shop-Warenkorb, bevor Sie weiter scannen.
      </p>

      <div className="so-basket-summary">
        <div>
          <div className="so-k">Positionen</div>
          <div className="so-v">{shopBasket.length}</div>
        </div>
        <div>
          <div className="so-k">Menge</div>
          <div className="so-v">{totalQty}</div>
        </div>
        {hasPrices ? (
          <div>
            <div className="so-k">Summe</div>
            <div className="so-v">{eur(totalSum)}</div>
          </div>
        ) : null}
      </div>

      <div className="so-basket-list" role="list">
        {shopBasket.map((item) => (
          <div className="so-basket-row" role="listitem" key={item.id}>
            <div>
              <strong>{item.title || item.artnum}</strong>
              <span>{item.artnum}</span>
            </div>
            <em>×{item.amount}</em>
          </div>
        ))}
      </div>

      {authError ? (
        <div className="so-auth-error" role="alert">
          {authError}
        </div>
      ) : null}

      <div className="so-basket-actions">
        <button
          type="button"
          className="so-cta so-cta--ghost so-cta--block"
          disabled={authLoading}
          onClick={() => void clearShopBasketChoice()}
        >
          {authLoading ? "Bitte warten…" : "Warenkorb leeren"}
        </button>
        <button
          type="button"
          className="so-cta so-cta--block"
          disabled={authLoading}
          onClick={() => void mergeShopBasket()}
        >
          Übernehmen und weiter
        </button>
      </div>
      <div className="so-authnote">
        Nach dem Übernehmen ist der App-Warenkorb maßgeblich bis zur Bestellung.
      </div>
    </>
  );
}
