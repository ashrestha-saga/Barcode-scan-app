"use client";

import { Keypad } from "@/components/ui/Keypad";
import { classifyLotExpiry } from "@/services/productAdapter";
import { eurUnit } from "@/lib/format";
import { deDate, formatGs1Date, rawPretty } from "@/lib/gs1";
import { useAppStore } from "@/store/appStore";

const MANUAL_MAX_LEN = 128;

function normalizeManual(value: string) {
  return value.replace(/\s+/g, "").slice(0, MANUAL_MAX_LEN);
}

export function SheetHost() {
  const sheet = useAppStore((s) => s.sheet);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const pending = useAppStore((s) => s.pending);
  const setUnit = useAppStore((s) => s.setUnit);
  const stepQty = useAppStore((s) => s.stepQty);
  const setQtyFromPad = useAppStore((s) => s.setQtyFromPad);
  const clearPad = useAppStore((s) => s.clearPad);
  const addPendingToCart = useAppStore((s) => s.addPendingToCart);
  const unknownCode = useAppStore((s) => s.unknownCode);
  const discardUnknown = useAppStore((s) => s.discardUnknown);
  const reportUnknown = useAppStore((s) => s.reportUnknown);
  const manual = useAppStore((s) => s.manual);
  const setManual = useAppStore((s) => s.setManual);
  const manualLookupMode = useAppStore((s) => s.manualLookupMode);
  const setManualLookupMode = useAppStore((s) => s.setManualLookupMode);
  const resolveManual = useAppStore((s) => s.resolveManual);

  const open = Boolean(sheet);

  return (
    <>
      <div className={`so-scrim ${open ? "on" : ""}`} onClick={() => closeSheet()} />
      <div className={`so-sheet ${open ? "on" : ""}`} role="dialog" aria-modal="true">
        <div className="so-grip" />
        <div className="so-sheet-in" key={sheet ?? "closed"}>
          {sheet === "product" && pending && (
            <>
              <div className="so-prod">
                <div className={`so-thumb ${pending.lot ? "udi" : ""}`}>
                  {pending.product.init}
                </div>
                <div>
                  <h3>{pending.product.name}</h3>
                  <div className="so-codes">
                    <span>{pending.product.sku}</span>
                    <span>GTIN {pending.product.gtin}</span>
                    <span>{pending.product.sym}</span>
                  </div>
                </div>
              </div>

              <div className="so-price">
                <div className="so-p">{eurUnit(pending.product.price)}</div>
                <div className="so-pu">je Stück</div>
              </div>
              <div className="so-stock">
                <i className="so-dot" />
                {pending.product.stock}
              </div>

              {pending.lot && (
                <div className="so-udi">
                  <div className="so-udi-head">
                    <span className="so-badge-udi">UDI / GS1</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--on-dark-soft)" }}>
                      Charge {pending.lot.lot}
                    </span>
                  </div>
                  <div className="so-udi-raw">{rawPretty(pending.lot.raw)}</div>
                  {pending.lot.ais.map((ai) => (
                    <div className="so-ai-row" key={ai.ai + ai.val}>
                      <span className="so-ai">({ai.ai})</span>
                      <span className="so-ail">{ai.name}</span>
                      <span className="so-aiv">
                        {ai.ai === "17" || ai.ai === "15" || ai.ai === "11"
                          ? formatGs1Date(ai.val)
                          : ai.val}
                      </span>
                    </div>
                  ))}
                  {(() => {
                    if (!pending.lot.expiry) return null;
                    const lvl = classifyLotExpiry(pending.lot);
                    const label =
                      lvl === "bad"
                        ? "Abgelaufen"
                        : lvl === "warn"
                          ? "Läuft bald ab"
                          : "Verfall unauffällig";
                    return (
                      <div className="so-exp" data-lvl={lvl}>
                        <div>
                          <b>{label}</b>
                          <span>Verfallsdatum {deDate(pending.lot.expiry)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="so-units" role="group" aria-label="Einheit">
                <button
                  type="button"
                  aria-pressed={pending.unit === "stk"}
                  onClick={() => setUnit("stk")}
                >
                  Stück
                  <b>1er</b>
                </button>
                <button
                  type="button"
                  aria-pressed={pending.unit === "vpe"}
                  onClick={() => setUnit("vpe")}
                >
                  {pending.product.vpeName}
                  <b>×{pending.product.vpe}</b>
                </button>
              </div>

              <div className="so-qty">
                <button type="button" className="so-step" onClick={() => stepQty(-1)}>
                  −
                </button>
                <div className="so-field">
                  <span>{pending.qty}</span>
                </div>
                <button type="button" className="so-step" onClick={() => stepQty(1)}>
                  +
                </button>
              </div>
              <div className={`so-qty-note ${pending.product.min > 1 ? "so-qty-warn" : ""}`}>
                Mindestmenge <b>{pending.product.min}</b>
                {pending.unit === "vpe"
                  ? ` · entspricht ${pending.qty * pending.product.vpe} Stück`
                  : null}
              </div>

              <Keypad
                onDigit={(d) => setQtyFromPad(d)}
                onClear={() => clearPad()}
                onBackspace={() => stepQty(-1)}
              />

              <div className="so-sheet-actions">
                <button type="button" className="so-cta so-cta--ghost" onClick={() => closeSheet()}>
                  Abbrechen
                </button>
                <button type="button" className="so-cta" onClick={() => addPendingToCart()}>
                  In den Warenkorb
                </button>
              </div>
            </>
          )}

          {sheet === "unknown" && (
            <div className="so-unknown">
              <span className="so-badge">Unbekannt</span>
              <h3>Barcode nicht zuordenbar</h3>
              <p>
                Der Code konnte keinem Artikel zugeordnet werden und wird nicht
                stillschweigend in eine Bestellung übernommen.
              </p>
              <div className="so-raw">{unknownCode}</div>
              <div className="so-sheet-actions">
                <button type="button" className="so-cta so-cta--ghost" onClick={() => discardUnknown()}>
                  Verwerfen
                </button>
                <button type="button" className="so-cta" onClick={() => reportUnknown()}>
                  Melden
                </button>
              </div>
            </div>
          )}

          {sheet === "manual" && (
            <div className="so-manual">
              <div className="so-manual-mode" role="group" aria-label="Suchfeld">
                <button
                  type="button"
                  aria-pressed={manualLookupMode === "oxean"}
                  onClick={() => setManualLookupMode("oxean")}
                >
                  EAN
                </button>
                <button
                  type="button"
                  aria-pressed={manualLookupMode === "oxartnum"}
                  onClick={() => setManualLookupMode("oxartnum")}
                >
                  Artikelnummer
                </button>
              </div>
              <label htmlFor="soManualField">
                {manualLookupMode === "oxean"
                  ? "EAN eingeben"
                  : "Artikelnummer eingeben"}
              </label>
              <input
                id="soManualField"
                className="so-input"
                type="text"
                inputMode={manualLookupMode === "oxean" ? "numeric" : "text"}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                autoFocus
                maxLength={MANUAL_MAX_LEN}
                value={manual}
                aria-label={
                  manualLookupMode === "oxean" ? "EAN" : "Artikelnummer"
                }
                onChange={(e) => setManual(normalizeManual(e.target.value))}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  if (!pasted) return;
                  e.preventDefault();
                  const el = e.currentTarget;
                  const start = el.selectionStart ?? manual.length;
                  const end = el.selectionEnd ?? manual.length;
                  setManual(
                    normalizeManual(
                      manual.slice(0, start) + pasted + manual.slice(end),
                    ),
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manual.trim()) {
                    e.preventDefault();
                    void resolveManual();
                  }
                }}
              />
              <div className="so-ex">
                {manualLookupMode === "oxean"
                  ? "Beispiel: 4031678011513"
                  : "Beispiel: VA-170520 · 1705205501"}
              </div>
              <Keypad
                onDigit={(d) => setManual(normalizeManual(manual + d))}
                onClear={() => setManual("")}
                onBackspace={() => setManual(manual.slice(0, -1))}
                leftKey={
                  manualLookupMode === "oxartnum"
                    ? {
                        label: "VA-",
                        onPress: () =>
                          setManual(normalizeManual(manual + "VA-")),
                      }
                    : undefined
                }
              />
              <div className="so-sheet-actions">
                <button type="button" className="so-cta so-cta--ghost" onClick={() => closeSheet()}>
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="so-cta"
                  disabled={!manual.trim()}
                  onClick={() => void resolveManual()}
                >
                  Anzeigen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
