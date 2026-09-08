"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { finishOAuthCallback } from "@/services/authService";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

function OAuthCallbackInner() {
  const params = useSearchParams();
  const code = params.get("code");
  const state = params.get("state");
  const oauthError = params.get("error");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await finishOAuthCallback({
          code,
          state,
          error: oauthError,
        });
        if (!cancelled) window.location.replace("/");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Anmeldung fehlgeschlagen.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, state, oauthError]);

  if (error) {
    return (
      <div className="so-app">
        <div className="so-auth on">
          <div className="so-auth-in">
            <div className="so-brand">
              <strong>med-sales ScanOrder</strong>
              <span>Scan-to-Order</span>
            </div>
            <h3>Anmeldung fehlgeschlagen</h3>
            <p className="so-lead">{error}</p>
            <a className="so-cta so-cta--block" href="/" style={{ marginTop: 16 }}>
              Zurück zur Anmeldung
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="so-app">
      <LoadingOverlay message="Anmeldung wird abgeschlossen" relative />
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="so-app">
          <LoadingOverlay message="Anmeldung wird abgeschlossen" relative />
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
