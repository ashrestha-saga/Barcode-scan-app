"use client";

import { CartRows } from "@/components/features/cart/CartRows";
import { useAppStore } from "@/store/appStore";

export function TabletCart() {
  const cart = useAppStore((s) => s.cart);
  const removeCartItem = useAppStore((s) => s.removeCartItem);

  return (
    <div className="so-list">
      <div className="so-list-head">
        <h3>Erfasste Positionen</h3>
        <span>{cart.length}</span>
      </div>
      <div className="so-items">
        <CartRows onRemove={removeCartItem} />
      </div>
    </div>
  );
}
