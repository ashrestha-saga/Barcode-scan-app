"use client";

import { eur } from "@/lib/format";
import { useAppStore } from "@/store/appStore";

export function Snack() {
  const snack = useAppStore((s) => s.snack);
  const undoOrder = useAppStore((s) => s.undoOrder);
  if (!snack) return <div className="so-snack" />;

  const committing = Boolean(snack.committing);
  return (
    <div className="so-snack on">
      <div className="so-st">
        {committing ? "Wird übermittelt…" : "Auftrag bereit zur Übermittlung"}
        <em>
          {snack.n} Position{snack.n === 1 ? "" : "en"} · {eur(snack.sum)}
        </em>
      </div>
      <button
        type="button"
        className="so-undo"
        disabled={committing}
        onClick={() => undoOrder()}
      >
        {committing ? (
          "Senden…"
        ) : (
          <>
            Undo <span>{snack.seconds} s</span>
          </>
        )}
      </button>
    </div>
  );
}
