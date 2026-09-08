"use client";

import { AuthHost } from "@/components/features/auth/AuthHost";
import { SheetHost } from "@/components/features/cart/SheetHost";
import { TabletCart } from "@/components/features/cart/TabletCart";
import { ViewHost } from "@/components/features/cart/ViewHost";
import { BottomBar } from "@/components/features/scan/BottomBar";
import { DevBar } from "@/components/features/scan/DevBar";
import { ScannerPane } from "@/components/features/scan/ScannerPane";
import { StatusBlock } from "@/components/features/scan/StatusBlock";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { Snack } from "@/components/ui/Snack";
import { Toast } from "@/components/ui/Toast";
import { useScanAppLifecycle } from "@/hooks/useScanAppLifecycle";
import { useAppStore } from "@/store/appStore";

export function ScanApp() {
  const hydrated = useAppStore((s) => s.hydrated);
  const online = useAppStore((s) => s.online);
  useScanAppLifecycle();

  if (!hydrated) {
    return (
      <div className="so-app">
        <LoadingOverlay message="ScanOrder wird geladen" relative />
      </div>
    );
  }

  return (
    <div className="so-app" data-net={online ? "online" : "offline"}>
      <StatusBlock />
      <div className="so-work">
        <ScannerPane />
        <TabletCart />
      </div>
      <BottomBar />
      <DevBar />
      <SheetHost />
      <ViewHost />
      <AuthHost />
      <Toast />
      <Snack />
    </div>
  );
}
