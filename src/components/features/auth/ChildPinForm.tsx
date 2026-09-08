"use client";

import { useMemo, useState } from "react";
import {
  SESSION_PIN_MAX,
  SESSION_PIN_MIN,
  isValidSessionPin,
  sanitizeSessionPinInput,
} from "@/lib/sessionPin";
import { useAppStore } from "@/store/appStore";

export function ChildPinForm() {
  const confirmChildPin = useAppStore((s) => s.confirmChildPin);
  const authLoading = useAppStore((s) => s.authLoading);
  const authError = useAppStore((s) => s.authError);
  const supportEmail = useAppStore((s) => s.username);
  const [pin, setPin] = useState("");

  const canSubmit = useMemo(() => isValidSessionPin(pin) && !authLoading, [pin, authLoading]);
  const mailto = supportEmail
    ? `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent("PIN Registrierung ScanOrder")}`
    : null;

  return (
    <>
      <h3>PIN eingeben</h3>
      <p className="so-lead">
        Für diesen Zugang ist eine PIN erforderlich. Die PIN identifiziert Ihren
        Bestellbereich und den zugehörigen Shop-Warenkorb.
      </p>

      <div className="so-field-g">
        <label htmlFor="session-pin">PIN</label>
        <div className={`so-fbox ${authError ? "so-fbox--err" : ""}`}>
          <input
            id="session-pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={SESSION_PIN_MAX}
            placeholder={`${SESSION_PIN_MIN}–${SESSION_PIN_MAX} Ziffern`}
            value={pin}
            disabled={authLoading}
            onChange={(e) => setPin(sanitizeSessionPinInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) void confirmChildPin(pin);
            }}
          />
        </div>
      </div>

      {authError ? (
        <div className="so-auth-error" role="alert">
          <p>{authError}</p>
          <p>
            Bitte wenden Sie sich an den technischen Support, um eine neue PIN zu
            registrieren, falls Sie keine besitzen.
            {mailto ? (
              <>
                {" "}
                <a className="so-auth-mail" href={mailto}>
                  E-Mail an {supportEmail}
                </a>
              </>
            ) : null}
          </p>
        </div>
      ) : (
        <div className="so-authnote">
          Nur Ziffern · mindestens {SESSION_PIN_MIN}, maximal {SESSION_PIN_MAX}{" "}
          Stellen
        </div>
      )}

      <button
        type="button"
        className="so-cta so-cta--block"
        style={{ marginTop: 18 }}
        disabled={!canSubmit}
        onClick={() => void confirmChildPin(pin)}
      >
        {authLoading ? "Wird geprüft…" : "PIN bestätigen"}
      </button>
    </>
  );
}
