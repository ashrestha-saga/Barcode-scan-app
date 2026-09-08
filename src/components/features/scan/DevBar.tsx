"use client";

import { useAppStore } from "@/store/appStore";

export function DevBar() {
  const openOutbox = useAppStore((s) => s.openOutbox);

  return (
    <div className="so-devbar" aria-label="Entwicklersteuerung">
      <button type="button" onClick={() => openOutbox()}>
        outbox
      </button>
    </div>
  );
}
