"use client";

import { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBarcode, faBolt, faKeyboard } from "@fortawesome/free-solid-svg-icons";
import { useBarcodeScanner } from "@/components/hooks/useBarcodeScanner";
import { useAppStore } from "@/store/appStore";

const CamTools = memo(function CamTools({
  live,
  torchSupported,
}: {
  live: boolean;
  torchSupported: boolean;
}) {
  const torch = useAppStore((s) => s.torch);
  const continuous = useAppStore((s) => s.continuous);
  const setTorch = useAppStore((s) => s.setTorch);
  const setContinuous = useAppStore((s) => s.setContinuous);
  const openManual = useAppStore((s) => s.openManual);

  return (
    <div className="so-camtools">
      <button
        type="button"
        className="so-chip"
        aria-pressed={torch}
        disabled={live && !torchSupported}
        onClick={() => setTorch(!torch)}
      >
        <FontAwesomeIcon icon={faBolt} className="so-chip-icon" />
        Licht
      </button>
      <button
        type="button"
        className="so-chip"
        aria-pressed={continuous}
        onClick={() => setContinuous(!continuous)}
      >
        <FontAwesomeIcon icon={faBarcode} className="so-chip-icon" />
        Dauerscan
      </button>
      <button type="button" className="so-chip" onClick={() => openManual()}>
        <FontAwesomeIcon icon={faKeyboard} className="so-chip-icon" />
        Nummer
      </button>
    </div>
  );
});

export function ScannerPane() {
  const loading = useAppStore((s) => s.loading);
  const netErr = useAppStore((s) => s.netErr);
  const camPerm = useAppStore((s) => s.camPerm);
  const setCamPerm = useAppStore((s) => s.setCamPerm);
  const flash = useAppStore((s) => s.flash);
  const scanSku = useAppStore((s) => s.scanSku);
  const retryLastScan = useAppStore((s) => s.retryLastScan);
  const sheet = useAppStore((s) => s.sheet);
  const view = useAppStore((s) => s.view);
  const authStep = useAppStore((s) => s.authStep);
  const authed = useAppStore((s) => s.authed);
  const expired = useAppStore((s) => s.expired);
  const torch = useAppStore((s) => s.torch);

  const paused = loading || Boolean(sheet) || Boolean(view) || Boolean(authStep);

  const { videoRef, live, torchSupported } = useBarcodeScanner({
    enabled: camPerm !== false && authed && !expired,
    paused,
    torch,
    onDetect: (code) => {
      void scanSku(code);
    },
    onPermission: (granted) => setCamPerm(granted),
  });

  return (
    <div
      className="so-cam"
      data-torch={torch ? "on" : "off"}
      data-live={live ? "on" : "off"}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label="Kamera"
      />
      <div className="so-scene" />
      <div className="so-cam-vig" />

      <div className="so-roi">
        <i />
        <i />
        <i />
        <i />
        <div className="so-sweep" />
        <div className="so-roi-hint">Barcode vollständig in den Rahmen halten</div>
      </div>

      <div className={`so-flash ${flash ? "on" : ""} ${flash === "err" ? "err" : ""}`} />

      <div className={`so-loading ${loading ? "on" : ""}`}>
        <div>
          <div className="so-spin" />
          <p>Artikel wird geladen</p>
        </div>
      </div>

      <div className={`so-neterr ${netErr ? "on" : ""}`}>
        <div>
          <h4>Keine Verbindung</h4>
          <p>
            Artikeldaten liegen auf dem Server. Bereits erfasste Positionen bleiben
            erhalten.
          </p>
          <button
            type="button"
            className="so-cta"
            style={{ marginTop: 14 }}
            onClick={() => void retryLastScan()}
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <div className={`so-perm ${camPerm === false ? "on" : ""}`}>
        <div className="so-perm-card">
          <div className="so-pc-b">
            <h4>
              <b>ScanOrder</b> möchte auf die Kamera zugreifen
            </h4>
            <p>
              Ohne Kamera bleibt die manuelle GTIN-/Artikelnummern-Eingabe verfügbar.
            </p>
          </div>
          <div className="so-pc-a">
            <button type="button" onClick={() => setCamPerm(false)}>
              Blockieren
            </button>
            <button type="button" onClick={() => setCamPerm(true)}>
              Erlauben
            </button>
          </div>
        </div>
      </div>

      <CamTools live={live} torchSupported={torchSupported} />
    </div>
  );
}
