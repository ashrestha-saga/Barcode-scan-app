"use client";

import { useEffect } from "react";
import { installDomReconcileGuards } from "@/lib/dom";
import { isAuthPersistKey } from "@/lib/tokenStorage";
import { useAppStore } from "@/store/appStore";

/** Hydrate, network, flash, toast, and snack timers for the scan shell. */
export function useScanAppLifecycle() {
  const hydrate = useAppStore((s) => s.hydrate);
  const setOnline = useAppStore((s) => s.setOnline);
  const syncOutbox = useAppStore((s) => s.syncOutbox);
  const clearFlash = useAppStore((s) => s.clearFlash);
  const clearToast = useAppStore((s) => s.clearToast);
  const tickSnack = useAppStore((s) => s.tickSnack);
  const flash = useAppStore((s) => s.flash);
  const toast = useAppStore((s) => s.toast);

  useEffect(() => {
    installDomReconcileGuards();
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const applyStoredAuth = useAppStore.getState().applyStoredAuth;
    const resumeSession = useAppStore.getState().resumeSession;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && !isAuthPersistKey(event.key)) return;
      applyStoredAuth();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void resumeSession();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void resumeSession();
    };

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      syncOutbox();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [setOnline, syncOutbox]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => clearFlash(), 360);
    return () => clearTimeout(t);
  }, [flash, clearFlash]);

  useEffect(() => {
    if (!toast) return;
    const ms = toast.tone === "err" ? 5200 : 2400;
    const t = setTimeout(() => clearToast(), ms);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  useEffect(() => {
    const id = setInterval(() => tickSnack(), 1000);
    return () => clearInterval(id);
  }, [tickSnack]);
}
