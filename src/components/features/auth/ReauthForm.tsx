"use client";

import { useState } from "react";
import { useAppStore } from "@/store/appStore";

export function ReauthForm() {
  const renewSession = useAppStore((s) => s.renewSession);
  const startOAuth = useAppStore((s) => s.startOAuth);
  const cart = useAppStore((s) => s.cart);
  const online = useAppStore((s) => s.online);
  const username = useAppStore((s) => s.username);
  const authLoading = useAppStore((s) => s.authLoading);
  const authError = useAppStore((s) => s.authError);
  const [tried, setTried] = useState(false);

  const onRefresh = async () => {
    setTried(true);
    const ok = await renewSession();
    if (!ok) setTried(true);
  };

  return (
    <div>
      <h3>Sitzung abgelaufen</h3>
      <p className="so-lead">
        Das Zugriffstoken ist nicht mehr gültig. Der erfasste Warenkorb bleibt
        vollständig erhalten — nur das Absenden erfordert eine gültige Sitzung.
      </p>
      {username ? (
        <div className="so-field-g">
          <label>Angemeldet als</label>
          <div className="so-fbox">{username}</div>
        </div>
      ) : null}
      {authError ? <p className="so-auth-error">{authError}</p> : null}
      <button
        type="button"
        className="so-cta so-cta--block"
        disabled={!online || authLoading}
        style={{ marginTop: 16 }}
        onClick={() => void onRefresh()}
      >
        {authLoading && !tried ? "Erneuern…" : "Sitzung erneuern"}
      </button>
      <button
        type="button"
        className="so-cta so-cta--block"
        disabled={!online || authLoading}
        style={{ marginTop: 10 }}
        onClick={() => void startOAuth()}
      >
        Beim Shop erneut anmelden
      </button>
      <div className="so-authnote">
        Warenkorb{" "}
        <b>
          {cart.length} Position{cart.length === 1 ? "" : "en"} gesichert
        </b>
        <br />
        {!online ? (
          <>
            Ohne Netz <b>keine Erneuerung möglich</b>
          </>
        ) : null}
      </div>
    </div>
  );
}
