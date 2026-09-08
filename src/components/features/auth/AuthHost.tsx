"use client";

import { BasketChoiceForm } from "@/components/features/auth/BasketChoiceForm";
import { ChildPinForm } from "@/components/features/auth/ChildPinForm";
import { LoginForm } from "@/components/features/auth/LoginForm";
import { ReauthForm } from "@/components/features/auth/ReauthForm";
import { ShippingAddressSelect } from "@/components/features/auth/ShippingAddressSelect";
import { useAuthOverlayOpen } from "@/components/hooks/useAuthOverlayOpen";
import { useAppStore } from "@/store/appStore";

export function AuthHost() {
  const open = useAuthOverlayOpen();
  const authStep = useAppStore((s) => s.authStep);

  if (!open || !authStep) return null;

  return (
    <div className="so-auth on">
      <div className="so-auth-in">
        <div className="so-brand">
          <strong>med-sales ScanOrder</strong>
          <span>Scan-to-Order</span>
        </div>
        {authStep === "credentials" && <LoginForm />}
        {authStep === "childPin" && <ChildPinForm />}
        {authStep === "basketChoice" && <BasketChoiceForm />}
        {authStep === "shipping" && <ShippingAddressSelect />}
        {authStep === "reauth" && <ReauthForm />}
      </div>
    </div>
  );
}
