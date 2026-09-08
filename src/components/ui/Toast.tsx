"use client";

import { useAppStore } from "@/store/appStore";

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  return (
    <div className={`so-toast ${toast ? "on" : ""} ${toast?.tone === "err" ? "err" : ""}`}>
      <strong>{toast?.msg ?? ""}</strong>
      {toast?.note ? <em>{toast.note}</em> : null}
    </div>
  );
}
