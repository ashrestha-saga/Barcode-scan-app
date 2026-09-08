"use client";

import { useAppStore } from "@/store/appStore";

/** Feature hook: whether the auth overlay is covering the scanner. */
export function useAuthOverlayOpen() {
  return useAppStore((s) => Boolean(s.authStep));
}
