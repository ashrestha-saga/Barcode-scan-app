import type { CartItem } from "@/interfaces/domain";

export interface ToastState {
  msg: string;
  note?: string;
  tone?: "err" | "ok";
}

/** Countdown before shop submit — Undo cancels without calling the API. */
export interface SnackState {
  /** Placeholder until submit succeeds. */
  no: string;
  n: number;
  sum: number;
  seconds: number;
  cart: CartItem[];
  shippingAddressId: string | null;
  /** Prevents double-commit when the timer fires. */
  committing?: boolean;
}
