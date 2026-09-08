"use client";

import { ORDER_ROLE } from "@/constants/roles";
import {
  selectShippingAddress,
  useAppStore,
} from "@/store/appStore";

export function StatusBlock() {
  const restoreBanner = useAppStore((s) => s.restoreBanner);
  const sessionBar = useAppStore((s) => s.sessionBar);
  const authed = useAppStore((s) => s.authed);
  const expired = useAppStore((s) => s.expired);
  const profileName = useAppStore((s) => s.profileName);
  const billingCompany = useAppStore((s) => s.billingCompany);
  const sessionChild = useAppStore((s) => s.sessionChild);
  const shipping = useAppStore(selectShippingAddress);
  const logout = useAppStore((s) => s.logout);
  const startAuth = useAppStore((s) => s.startAuth);

  const custnr = sessionChild?.custnr?.trim() || shipping.custnr;
  const title = profileName || billingCompany || "Konto";

  return (
    <div className="so-status">
      <div className="so-netbar">
        <i className="so-dot" />
        <span>Offline — Erfassung läuft weiter</span>
      </div>
      <div className={`so-banner ${restoreBanner ? "on" : ""}`}>
        ◆ Entwurf wiederhergestellt
      </div>
      <div className={`so-banner warn ${sessionBar ? "on" : ""}`}>
        ◆ Sitzung abgelaufen — Anmeldung erforderlich
      </div>
      <div className={`so-ctx ${authed && !expired ? "on" : ""}`}>
        <div className="so-cn">
          <b>{title}</b>
          <span>
            {billingCompany && profileName ? (
              <>
                {billingCompany}
                <br />
              </>
            ) : null}
            Kundennummer {custnr}
          </span>
        </div>
        <div className="so-ctx-actions">
          <span className="so-role">{ORDER_ROLE.label}</span>
          <button type="button" className="so-logout" onClick={() => void logout()}>
            Abmelden
          </button>
        </div>
      </div>
      {expired && (
        <div className="so-ctx on">
          <div className="so-cn">
            <b>Sitzung abgelaufen</b>
            <span>Warenkorb bleibt erhalten</span>
          </div>
          <div className="so-ctx-actions">
            <button type="button" onClick={() => startAuth("reauth")}>
              Erneuern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
