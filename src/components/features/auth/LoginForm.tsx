"use client";

import { useState } from "react";
import { oauthConfigured, startOAuthLogin } from "@/services/authService";
import { useAppStore } from "@/store/appStore";

export function LoginForm() {
  const online = useAppStore((s) => s.online);
  const authError = useAppStore((s) => s.authError);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const missingClient = !oauthConfigured();
  const formError = localError || authError;

  const onLogin = () => {
    if (!online || missingClient || busy) return;
    setBusy(true);
    setLocalError(null);
    void startOAuthLogin().catch((err: unknown) => {
      setBusy(false);
      setLocalError(
        err instanceof Error ? err.message : "Anmeldung fehlgeschlagen.",
      );
    });
  };

  return (
    <div>
      <h3>Anmelden</h3>
      <p className="so-lead">
        Die Anmeldung ersetzt den Checkout: Sie bestimmt Kundennummer,
        Konditionen, Lieferort und Bestellrecht für jeden Auftrag.
      </p>
      {formError ? <p className="so-auth-error">{formError}</p> : null}
      {missingClient ? (
        <p className="so-auth-error">
          OAuth-Client-ID fehlt (NEXT_PUBLIC_OAUTH_CLIENT_ID).
        </p>
      ) : null}
      <button
        type="button"
        className="so-cta so-cta--block"
        disabled={busy || !online || missingClient}
        style={{ marginTop: 16 }}
        onClick={onLogin}
      >
        {busy ? "Weiterleiten…" : "Mit Shop anmelden"}
      </button>
      <div className="so-authnote">
        OAuth 2.0 <b>Authorization Code + PKCE</b>
        <br />
        Sitzung bleibt auf diesem Gerät, bis Sie sich abmelden
      </div>
    </div>
  );
}
