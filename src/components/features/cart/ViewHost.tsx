"use client";

import { CartRows } from "@/components/features/cart/CartRows";
import { ORDER_ROLE } from "@/constants/roles";
import { eur, eurUnit } from "@/lib/format";
import {
  selectShippingAddress,
  selectTotals,
  useAppStore,
} from "@/store/appStore";
import { useShallow } from "zustand/react/shallow";

export function ViewHost() {
  const view = useAppStore((s) => s.view);
  const closeView = useAppStore((s) => s.closeView);
  const removeCartItem = useAppStore((s) => s.removeCartItem);
  const totals = useAppStore(useShallow(selectTotals));
  const shipping = useAppStore(selectShippingAddress);
  const requestSubmit = useAppStore((s) => s.requestSubmit);
  const conflicts = useAppStore((s) => s.conflicts);
  const acceptConflict = useAppStore((s) => s.acceptConflict);
  const cancelConflict = useAppStore((s) => s.cancelConflict);
  const done = useAppStore((s) => s.done);
  const newScan = useAppStore((s) => s.newScan);
  const openOutbox = useAppStore((s) => s.openOutbox);
  const outbox = useAppStore((s) => s.outbox);
  const undoOrder = useAppStore((s) => s.undoOrder);

  return (
    <>
      <div className={`so-view ${view === "cart" ? "on" : ""}`}>
        <div className="so-view-head">
          <button type="button" className="so-back" aria-label="Zurück" onClick={() => closeView()}>
            ←
          </button>
          <h3>Warenkorb</h3>
        </div>
        <div className="so-view-body">
          <CartRows onRemove={removeCartItem} />
        </div>
        <div className="so-cartfoot">
          <div className="so-ship">
            <div>
              <div className="so-k">Lieferort</div>
              <div className="so-v">{shipping.ship}</div>
            </div>
          </div>
          <div className="so-foot-sum">
            <div className="so-k">Summe netto</div>
            <div className="so-v">{eur(totals.sum)}</div>
          </div>
          <button
            type="button"
            className="so-cta so-cta--block"
            disabled={!totals.n}
            onClick={() => requestSubmit()}
          >
            {ORDER_ROLE.cta}
          </button>
        </div>
      </div>

      <div className={`so-view ${view === "conflict" ? "on" : ""}`}>
        <div className="so-view-head">
          <button type="button" className="so-back" aria-label="Zurück" onClick={() => cancelConflict()}>
            ←
          </button>
          <h3>Preise haben sich geändert</h3>
        </div>
        <div className="so-view-body">
          <div className="so-conf">
            <span className="so-badge">Abweichung erkannt</span>
            <h4>Preise weichen vom erfassten Stand ab</h4>
            <p>
              Die Bestellung wurde nicht ausgelöst. Prüfen Sie die Änderungen und
              entscheiden Sie einmal für alle Positionen.
            </p>
            <div className="so-diff">
              {conflicts.map((c) => (
                <div className="so-diff-row" key={c.sku}>
                  <div className="so-dn">{c.name}</div>
                  <div className="so-dv">
                    <span className="so-old">{eurUnit(c.oldPrice)}</span>→
                    <span className="so-new">{eurUnit(c.newPrice)}</span>
                    <span style={{ color: "var(--on-dark-soft)" }}>+{c.pct} %</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="so-sheet-actions" style={{ marginTop: 18 }}>
              <button type="button" className="so-cta so-cta--ghost" onClick={() => cancelConflict()}>
                Zurück
              </button>
              <button type="button" className="so-cta" onClick={() => acceptConflict()}>
                Preise übernehmen und bestellen
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`so-view ${view === "done" ? "on" : ""}`}>
        <div className="so-view-body">
          {done && (
            <div className="so-done">
              <div
                className={`so-check ${
                  done.status === "failed"
                    ? "so-check--err"
                    : done.status === "pending" || done.status === "submitting"
                      ? "so-check--pending"
                      : ""
                }`}
              >
                {done.status === "failed" ? (
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                ) : done.status === "pending" || done.status === "submitting" ? (
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <circle cx="12" cy="12" r="8" fill="none" strokeWidth="2" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M4 12.5l5.2 5.2L20 7" />
                  </svg>
                )}
              </div>
              <h4>
                {done.status === "pending"
                  ? "Übermittlung in Kürze"
                  : done.status === "submitting"
                    ? "Wird übermittelt…"
                    : done.status === "failed"
                      ? "Bestellung fehlgeschlagen"
                      : "Bestellung ausgelöst"}
              </h4>
              {done.status === "success" ? (
                <div className="so-ordno">{done.no}</div>
              ) : done.status === "failed" ? (
                <p className="so-done-error" role="alert">
                  {done.error || "Die Bestellung konnte nicht ausgelöst werden."}
                </p>
              ) : (
                <p>
                  {done.status === "submitting"
                    ? "Warenkorb wird an den Shop gesendet."
                    : "Sie können die Bestellung noch abbrechen (Undo)."}
                </p>
              )}
              {done.status === "success" ? (
                <p>
                  Der Auftrag wurde direkt über die Shop-API angelegt — ohne Checkout im Shop.
                </p>
              ) : null}
              <div className="so-recap">
                <div>
                  <div className="so-k">Positionen</div>
                  <div className="so-v">{done.n}</div>
                </div>
                <div>
                  <div className="so-k">Summe netto</div>
                  <div className="so-v">{eur(done.sum)}</div>
                </div>
                <div>
                  <div className="so-k">Kundennummer</div>
                  <div className="so-v">{done.custnr}</div>
                </div>
                <div>
                  <div className="so-k">Ausgelöst von</div>
                  <div className="so-v">{done.userLabel}</div>
                </div>
                <div>
                  <div className="so-k">Lieferung</div>
                  <div className="so-v">
                    {done.name ? <div>{done.name}</div> : null}
                    {done.company ? <div>{done.company}</div> : null}
                    <div>{done.site}</div>
                  </div>
                </div>
              </div>
              <div className="so-authnote" style={{ textAlign: "left" }}>
                Autorisierung <b>
                  {done.roleLabel} · {done.custnr}
                </b>
              </div>
              <div className="so-sheet-actions" style={{ marginTop: 22 }}>
                {done.status === "failed" ? (
                  <>
                    <button type="button" className="so-cta so-cta--ghost" onClick={() => newScan()}>
                      Zurück zum Warenkorb
                    </button>
                    <button type="button" className="so-cta" onClick={() => requestSubmit()}>
                      Erneut bestellen
                    </button>
                  </>
                ) : done.status === "pending" || done.status === "submitting" ? (
                  <button
                    type="button"
                    className="so-cta so-cta--ghost"
                    disabled={done.status === "submitting"}
                    onClick={() => undoOrder()}
                  >
                    Abbrechen
                  </button>
                ) : (
                  <>
                    <button type="button" className="so-cta so-cta--ghost" onClick={() => openOutbox()}>
                      Bestellungen
                    </button>
                    <button type="button" className="so-cta" onClick={() => newScan()}>
                      Weiter scannen
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`so-view ${view === "outbox" ? "on" : ""}`}>
        <div className="so-view-head">
          <button type="button" className="so-back" aria-label="Zurück" onClick={() => closeView()}>
            ←
          </button>
          <h3>Outbox</h3>
        </div>
        <div className="so-view-body">
          <div className="so-ob">
            {!outbox.length ? (
              <div className="so-empty">
                <strong>Keine Bestellungen</strong>
                <p>Ausgelöste Bestellungen erscheinen hier mit ihrem Übertragungsstatus.</p>
              </div>
            ) : (
              outbox
                .slice()
                .reverse()
                .map((e) => (
                  <div className="so-ob-row" key={e.id}>
                    <div>
                      <div className="so-on">{e.no}</div>
                      <div className="so-om">
                        {e.n} Positionen
                        {` · ${eur(e.sum)}`}
                        {e.request ? " · Freigabe" : ""}
                      </div>
                    </div>
                    <div className="so-os">{e.state}</div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
