"use client";

import { create } from "zustand";
import {
  logoutOAuth,
  refreshSession,
  startOAuthLogin,
} from "@/services/authService";
import {
  addCartToShop,
  clearShopBasket,
  fetchShopBasket,
  shopCartToLocalItems,
  submitOrderToShop,
  validateSessionPin,
} from "@/services/checkoutService";
import type { ShopCartLine, ValidatedChild } from "@/services/parseCheckout";
import {
  validatedChildDisplayName,
  validatedChildUserLabel,
} from "@/services/parseCheckout";
import { ShopApiError } from "@/services/http";
import {
  EMPTY_SHIPPING_ADDRESS,
  profileUserLabel,
  profileDisplayName,
  billingCompanyFromProfile,
  triggeredByLabel,
} from "@/lib/oauthProfile";
import { clearEncryptedSessionPin, saveEncryptedSessionPin } from "@/lib/pinVault";
import { isValidSessionPin } from "@/lib/sessionPin";
import {
  classifyLotExpiry,
  formatLotExpiry,
  resolveProduct,
  type LotState,
} from "@/services/productAdapter";
import {
  buildCartItem,
  cartTotals,
  findMergeIndex,
  incrementCartItem,
} from "@/lib/cart";
import { newId } from "@/lib/format";
import { afterNextPaint, blurActiveElement } from "@/lib/dom";
import { ORDER_ROLE } from "@/constants/roles";
import type {
  AuthStep,
  ShippingAddress,
  CartItem,
  DoneRecap,
  FullView,
  LotInfo,
  OutboxEntry,
  PriceDiff,
  Product,
  SheetKind,
  UnitKind,
} from "@/interfaces/domain";
import type { ArticleLookupKey, ManualLookupMode } from "@/interfaces/article";
import type { SnackState, ToastState } from "@/interfaces/ui";
import {
  loadCartDraft,
  loadOutbox,
  loadSession,
  saveCartDraft,
  saveOutbox,
  saveSession,
} from "@/lib/db";
import {
  getAccessToken,
  getRefreshToken,
  getStoredAccount,
  getStoredShippingAddresses,
  getStoredProfile,
  getStoredUsername,
  isAuthPersistKey,
  isTokenExpired,
  needsAddressPick,
  needsBasketCheck,
  needsChildPin,
  setNeedsAddressPick,
  setNeedsBasketCheck,
  setNeedsChildPin,
  setStoredAccount,
} from "@/lib/tokenStorage";

interface PendingProduct {
  product: Product;
  lot: LotInfo | null;
  qty: number;
  unit: UnitKind;
  pad: string;
}

interface AppState {
  hydrated: boolean;
  online: boolean;
  torch: boolean;
  continuous: boolean;
  camPerm: boolean | null;
  loading: boolean;
  netErr: boolean;
  flash: "ok" | "err" | null;
  restoreBanner: boolean;
  sessionBar: boolean;

  authStep: AuthStep;
  authed: boolean;
  expired: boolean;
  username: string;
  userLabel: string;
  profileName: string;
  billingCompany: string;
  authLoading: boolean;
  authError: string | null;
  shippingAddresses: ShippingAddress[];
  shippingAddressIdx: number;
  /** Child unlocked by session PIN (from validatepin). */
  sessionChild: ValidatedChild | null;
  shopBasket: ShopCartLine[];

  cart: CartItem[];
  outbox: OutboxEntry[];
  ordNo: number;

  sheet: SheetKind;
  pending: PendingProduct | null;
  unknownCode: string;
  manual: string;
  manualLookupMode: ManualLookupMode;
  lotState: LotState;

  view: FullView;
  done: DoneRecap | null;
  conflicts: PriceDiff[];
  toast: ToastState | null;
  snack: SnackState | null;
  lastScanCode: string | null;
  lastLookupKey: ArticleLookupKey;

  hydrate: () => Promise<void>;
  applyStoredAuth: () => void;
  resumeSession: () => Promise<void>;
  setOnline: (v: boolean) => void;
  setTorch: (v: boolean) => void;
  setContinuous: (v: boolean) => void;
  setCamPerm: (v: boolean) => void;
  setLotState: (s: LotState) => void;
  setShippingAddressIdx: (i: number) => void;

  startAuth: (step?: AuthStep) => void;
  startOAuth: () => Promise<void>;
  confirmChildPin: (pin: string) => Promise<void>;
  runBasketCheck: () => Promise<void>;
  mergeShopBasket: () => Promise<void>;
  clearShopBasketChoice: () => Promise<void>;
  confirmShippingAddress: () => void;
  renewSession: () => Promise<boolean>;
  logout: () => Promise<void>;

  openManual: () => void;
  setManual: (v: string) => void;
  setManualLookupMode: (mode: ManualLookupMode) => void;
  closeSheet: () => void;
  openCart: () => void;
  closeView: () => void;
  openOutbox: (note?: string) => void;

  scanSku: (sku: string, lookupKey?: ArticleLookupKey) => Promise<void>;
  retryLastScan: () => Promise<void>;
  resolveManual: () => Promise<void>;
  setUnit: (u: UnitKind) => void;
  stepQty: (delta: number) => void;
  setQtyFromPad: (digit: string) => void;
  clearPad: () => void;
  addPendingToCart: () => void;
  discardUnknown: () => void;
  reportUnknown: () => void;
  removeCartItem: (id: string) => void;

  requestSubmit: () => void;
  acceptConflict: () => void;
  cancelConflict: () => void;
  /** Starts undo countdown; shop submit runs when the timer ends. */
  beginPendingSubmit: () => void;
  /** Actually calls shop addtocart + submitorder (after countdown or offline skip). */
  commitPendingOrder: () => Promise<void>;
  newScan: () => void;
  clearFlash: () => void;
  clearToast: () => void;
  tickSnack: () => void;
  dismissSnack: () => void;
  undoOrder: () => void;
  syncOutbox: () => void;
  persist: () => Promise<void>;
}

function shippingAddress(shippingAddresses: ShippingAddress[], idx: number) {
  return shippingAddresses[idx] ?? shippingAddresses[0] ?? EMPTY_SHIPPING_ADDRESS;
}

function authFieldsFromStorage(shippingAddressIdx: number) {
  const token = getAccessToken();
  const tokenExpired = Boolean(token) && isTokenExpired();
  const hasSession = Boolean(token) && !tokenExpired;
  const shippingAddresses = getStoredShippingAddresses();
  const profile = getStoredProfile();
  const username = getStoredUsername();
  const account = getStoredAccount();
  const needPin = hasSession && needsChildPin();
  const needBasket = hasSession && !needPin && needsBasketCheck();
  const needPick =
    hasSession && !needPin && !needBasket && needsAddressPick() && shippingAddresses.length > 1;
  const canRetry = Boolean(getRefreshToken()) || tokenExpired || Boolean(token);

  let authStep: AuthStep;
  if (!hasSession) {
    authStep = canRetry ? "reauth" : "credentials";
  } else if (needPin) {
    authStep = "childPin";
  } else if (needBasket) {
    authStep = "basketChoice";
  } else if (needPick) {
    authStep = "shipping";
  } else {
    authStep = null;
  }

  const childLabel = account ? validatedChildUserLabel(account) : "";
  const childName = account ? validatedChildDisplayName(account) : "";

  return {
    authed: hasSession && !needPin && !needBasket && !needPick,
    username,
    userLabel: childLabel || (profile ? profileUserLabel(profile) : username),
    profileName: childName || (profile ? profileDisplayName(profile) : ""),
    billingCompany: profile ? billingCompanyFromProfile(profile) : "",
    shippingAddresses,
    shippingAddressIdx: Math.min(shippingAddressIdx, Math.max(0, shippingAddresses.length - 1)),
    sessionChild: account,
    expired: tokenExpired,
    sessionBar: tokenExpired,
    authStep,
  };
}

function finishOnboarding(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
) {
  setNeedsBasketCheck(false);
  const shippingAddresses = get().shippingAddresses;
  if (needsAddressPick() && shippingAddresses.length > 1) {
    set({
      authStep: "shipping",
      authed: false,
      authLoading: false,
      authError: null,
      shopBasket: [],
    });
    return;
  }
  setNeedsAddressPick(false);
  const a = shippingAddress(shippingAddresses, get().shippingAddressIdx);
  set({
    authStep: null,
    authed: true,
    expired: false,
    sessionBar: false,
    authLoading: false,
    authError: null,
    shopBasket: [],
    toast: {
      msg: "Angemeldet",
      note: `Kd.-Nr. ${a.custnr} · ${ORDER_ROLE.label}`,
    },
  });
  void persistAll(get);
}


async function unmountManualSheet(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  patch: Partial<AppState>,
) {
  if (get().sheet === "manual") {
    blurActiveElement();
    await afterNextPaint();
  }
  set(patch);
}

async function persistAll(get: () => AppState) {
  const s = get();
  const cust = s.shippingAddresses[s.shippingAddressIdx]?.id ?? null;
  await Promise.all([
    saveCartDraft(s.cart, cust),
    saveOutbox(s.outbox),
    saveSession({
      authed: s.authed,
      shippingAddressIdx: s.shippingAddressIdx,
      expired: s.expired,
    }),
  ]);
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  torch: false,
  continuous: false,
  camPerm: null,
  loading: false,
  netErr: false,
  flash: null,
  restoreBanner: false,
  sessionBar: false,

  authStep: "credentials",
  authed: false,
  expired: false,
  username: "",
  userLabel: "",
  profileName: "",
  billingCompany: "",
  authLoading: false,
  authError: null,
  shippingAddresses: [],
  shippingAddressIdx: 0,
  sessionChild: null,
  shopBasket: [],

  cart: [],
  outbox: [],
  ordNo: 2481,

  sheet: null,
  pending: null,
  unknownCode: "",
  manual: "",
  manualLookupMode: "oxean",
  lotState: "ok",

  view: null,
  done: null,
  conflicts: [],
  toast: null,
  snack: null,
  lastScanCode: null,
  lastLookupKey: "oxean",

  hydrate: async () => {
    try {
      const [draft, outbox, session] = await Promise.all([
        loadCartDraft(),
        loadOutbox(),
        loadSession(),
      ]);

      if (getRefreshToken() && (!getAccessToken() || isTokenExpired())) {
        try {
          await refreshSession();
        } catch {
          /* invalid grant clears storage; network errors keep tokens for retry */
        }
      }

      const shippingAddressIdx = Math.min(
        session?.shippingAddressIdx ?? session?.accountIdx ?? 0,
        Math.max(0, getStoredShippingAddresses().length - 1),
      );
      set({
        hydrated: true,
        cart: draft?.items ?? [],
        outbox: outbox ?? [],
        shopBasket: [],
        ...authFieldsFromStorage(shippingAddressIdx),
        restoreBanner: Boolean(draft?.items?.length),
        online: navigator.onLine,
      });
      if (draft?.items?.length) {
        setTimeout(() => set({ restoreBanner: false }), 2800);
      }
      if (needsBasketCheck() && !needsChildPin() && getAccessToken() && !isTokenExpired()) {
        void get().runBasketCheck();
      }
    } catch {
      set({
        hydrated: true,
        authStep: "credentials",
        authed: false,
        username: "",
        userLabel: "",
        profileName: "",
        billingCompany: "",
        shippingAddresses: [],
      });
    }
  },

  applyStoredAuth: () => {
    set(authFieldsFromStorage(get().shippingAddressIdx));
  },

  resumeSession: async () => {
    if (!getRefreshToken() && !getAccessToken()) {
      set(authFieldsFromStorage(get().shippingAddressIdx));
      return;
    }
    if (getRefreshToken() && (!getAccessToken() || isTokenExpired())) {
      try {
        await refreshSession();
      } catch {
        /* retry later */
      }
    }
    set(authFieldsFromStorage(get().shippingAddressIdx));
  },

  setOnline: (v) => set({ online: v, netErr: v ? false : get().netErr }),
  setTorch: (v) => set({ torch: v }),
  setContinuous: (v) => set({ continuous: v }),
  setCamPerm: (v) => set({ camPerm: v }),
  setLotState: (s) => set({ lotState: s }),
  setShippingAddressIdx: (i) => set({ shippingAddressIdx: i }),

  startAuth: (step = "credentials") => {
    set({ authStep: step, sheet: null, view: null, authError: null });
  },

  startOAuth: async () => {
    set({ authLoading: true, authError: null });
    try {
      await startOAuthLogin();
    } catch (err) {
      set({
        authLoading: false,
        authError:
          err instanceof Error ? err.message : "Anmeldung fehlgeschlagen.",
      });
    }
  },

  confirmChildPin: async (pin) => {
    if (!getAccessToken()) {
      set({
        authStep: "credentials",
        authed: false,
        authError: "Bitte zuerst anmelden.",
      });
      return;
    }
    if (!isValidSessionPin(pin)) {
      set({
        authError: "PIN muss aus 3 bis 11 Ziffern bestehen.",
      });
      return;
    }

    set({ authLoading: true, authError: null });
    try {
      const child = await validateSessionPin(pin);
      await saveEncryptedSessionPin(pin);
      setStoredAccount(child);
      setNeedsChildPin(false);
      set({
        authLoading: false,
        sessionChild: child,
        profileName: validatedChildDisplayName(child),
        userLabel: validatedChildUserLabel(child) || get().userLabel,
      });
      await get().runBasketCheck();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "PIN ungültig.";
      set({
        authLoading: false,
        authError: message,
        toast: {
          msg: "PIN ungültig",
          note: "Support kontaktieren, falls keine PIN vorhanden ist",
          tone: "err",
        },
      });
    }
  },

  runBasketCheck: async () => {
    if (!getAccessToken()) {
      set({ authStep: "credentials", authed: false });
      return;
    }
    set({
      authLoading: true,
      authError: null,
      authStep: "basketChoice",
      authed: false,
    });
    try {
      const items = await fetchShopBasket();
      if (items.length > 0) {
        set({
          shopBasket: items,
          authStep: "basketChoice",
          authLoading: false,
          authed: false,
        });
        return;
      }
      setNeedsBasketCheck(false);
      set({ shopBasket: [] });
      finishOnboarding(get, set);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Warenkorb konnte nicht geladen werden.";
      // Don't block login forever — continue without merge/clear.
      setNeedsBasketCheck(false);
      set({
        shopBasket: [],
        authLoading: false,
        toast: {
          msg: "Shop-Warenkorb nicht geladen",
          note: message,
          tone: "err",
        },
      });
      finishOnboarding(get, set);
    }
  },

  mergeShopBasket: async () => {
    const lines = get().shopBasket;
    const incoming = shopCartToLocalItems(lines);
    let cart = get().cart.slice();
    for (const item of incoming) {
      const idx = findMergeIndex(cart, item);
      if (idx >= 0) {
        cart = cart.map((row, i) =>
          i === idx ? incrementCartItem(row, item.qty, item.unitPrice || row.unitPrice) : row,
        );
      } else {
        cart = [...cart, item];
      }
    }
    setNeedsBasketCheck(false);
    set({ cart, shopBasket: [] });
    void persistAll(get);
    finishOnboarding(get, set);
  },

  clearShopBasketChoice: async () => {
    const lines = get().shopBasket;
    set({ authLoading: true, authError: null });
    try {
      await clearShopBasket(lines);
      setNeedsBasketCheck(false);
      set({ shopBasket: [], authLoading: false });
      finishOnboarding(get, set);
    } catch (err) {
      set({
        authLoading: false,
        authError:
          err instanceof Error
            ? err.message
            : "Warenkorb konnte nicht geleert werden.",
      });
    }
  },

  confirmShippingAddress: () => {
    if (!getAccessToken()) {
      set({
        authStep: "credentials",
        authed: false,
        authError: "Bitte zuerst anmelden.",
      });
      return;
    }
    setNeedsAddressPick(false);
    const a = shippingAddress(get().shippingAddresses, get().shippingAddressIdx);
    set({
      authed: true,
      expired: false,
      sessionBar: false,
      authStep: null,
      toast: {
        msg: "Angemeldet",
        note: `Kd.-Nr. ${a.custnr} · ${ORDER_ROLE.label}`,
      },
    });
    void persistAll(get);
  },

  renewSession: async () => {
    set({ authLoading: true, authError: null });
    try {
      await refreshSession();
      const fields = authFieldsFromStorage(get().shippingAddressIdx);
      set({
        authLoading: false,
        ...fields,
        expired: false,
        sessionBar: false,
        toast: { msg: "Sitzung erneuert", note: "Warenkorb gesichert" },
      });
      void persistAll(get);
      if (needsBasketCheck() && !needsChildPin()) {
        void get().runBasketCheck();
      }
      return true;
    } catch (err) {
      set({
        authLoading: false,
        authError:
          err instanceof Error ? err.message : "Erneuerung fehlgeschlagen.",
      });
      return false;
    }
  },

  logout: async () => {
    await logoutOAuth();
    await clearEncryptedSessionPin().catch(() => undefined);
    setStoredAccount(null);
    setNeedsChildPin(false);
    setNeedsBasketCheck(false);
    setNeedsAddressPick(false);
    set({
      authed: false,
      expired: false,
      username: "",
      userLabel: "",
      profileName: "",
      billingCompany: "",
      shippingAddresses: [],
      shippingAddressIdx: 0,
      sessionChild: null,
      shopBasket: [],
      authStep: "credentials",
      sessionBar: false,
      sheet: null,
      view: null,
      authError: null,
    });
    void persistAll(get);
  },

  openManual: () =>
    set({ sheet: "manual", manual: "", pending: null }),
  setManual: (v) => set({ manual: v }),
  setManualLookupMode: (mode) => set({ manualLookupMode: mode, manual: "" }),

  closeSheet: () => {
    void unmountManualSheet(get, set, {
      sheet: null,
      pending: null,
    });
  },
  openCart: () => set({ view: "cart", sheet: null }),
  closeView: () => set({ view: null }),
  openOutbox: () => set({ view: "outbox", sheet: null }),

  scanSku: async (sku, lookupKey = "oxean") => {
    const s = get();
    if (!s.authed || s.expired) {
      set({ authStep: s.expired ? "reauth" : "credentials" });
      return;
    }
    const fromManual = s.sheet === "manual";
    if (fromManual) {
      blurActiveElement();
      await afterNextPaint();
    }
    set({
      loading: true,
      netErr: false,
      lastScanCode: sku,
      lastLookupKey: lookupKey,
      ...(fromManual ? {} : { sheet: null }),
    });
    try {
      const result = await resolveProduct(sku, {
        online: s.online,
        lotState: s.lotState,
        lookupKey,
      });
      if (result.kind === "unknown") {
        blurActiveElement();
        set({ loading: false });
        await afterNextPaint();
        set({
          flash: "err",
          sheet: "unknown",
          unknownCode: result.code,
          toast: { msg: "Unbekannter Code", note: result.code, tone: "err" },
        });
        return;
      }

      const minQty = result.product.min;
      const pending: PendingProduct = {
        product: result.product,
        lot: result.lot,
        qty: minQty,
        unit: "stk",
        pad: "",
      };

      if (s.continuous) {
        set({ loading: false, pending });
        get().addPendingToCart();
        return;
      }

      blurActiveElement();
      set({ loading: false });
      await afterNextPaint();
      set({
        flash: "ok",
        sheet: "product",
        pending,
      });
    } catch (err) {
      blurActiveElement();
      set({ loading: false });
      await afterNextPaint();
      set({
        netErr: true,
        flash: "err",
        toast: {
          msg: "Artikel nicht geladen",
          note: err instanceof Error ? err.message : "Bitte erneut versuchen",
          tone: "err",
        },
      });
    }
  },

  retryLastScan: async () => {
    const online =
      typeof navigator === "undefined" ? get().online : navigator.onLine;
    set({ online, netErr: online ? false : get().netErr });
    if (online) get().syncOutbox();
    const code = get().lastScanCode;
    if (code) {
      await get().scanSku(code, get().lastLookupKey);
      return;
    }
    if (online) set({ netErr: false });
  },

  resolveManual: async () => {
    const code = get().manual.trim();
    if (!code) return;
    await get().scanSku(code, get().manualLookupMode);
  },

  setUnit: (u) => {
    const p = get().pending;
    if (!p) return;
    const qty = Math.max(p.product.min, u === "vpe" ? 1 : p.product.min);
    set({ pending: { ...p, unit: u, qty, pad: "" } });
  },

  stepQty: (delta) => {
    const p = get().pending;
    if (!p) return;
    const step = p.unit === "vpe" ? 1 : Math.max(1, p.product.min);
    const next = Math.max(step, p.qty + delta * step);
    set({ pending: { ...p, qty: next, pad: "" } });
  },

  setQtyFromPad: (digit) => {
    const p = get().pending;
    if (!p) return;
    const pad = (p.pad + digit).replace(/^0+(?=\d)/, "").slice(0, 5);
    const qty = Math.max(1, parseInt(pad || "0", 10));
    set({ pending: { ...p, pad, qty } });
  },

  clearPad: () => {
    const p = get().pending;
    if (!p) return;
    set({ pending: { ...p, pad: "", qty: p.product.min } });
  },

  addPendingToCart: () => {
    const s = get();
    const p = s.pending;
    if (!p) return;

    const level = classifyLotExpiry(p.lot);
    if (level === "bad") {
      set({
        toast: {
          msg: "Charge abgelaufen",
          note: "Nicht ohne Ersatz-Workflow bestellbar",
          tone: "err",
        },
        flash: "err",
      });
      // Still allow add for draft capture but flag level
    }

    const candidate = buildCartItem(p.product, p.qty, p.unit, {
      lot: p.lot?.lot,
      expiry: p.lot ? formatLotExpiry(p.lot) : undefined,
      expiryLevel: level,
      serial: p.lot?.serial,
      rawUdi: p.lot?.raw,
    });

    const idx = findMergeIndex(s.cart, candidate);
    let cart: CartItem[];
    if (idx >= 0) {
      cart = s.cart.map((item, i) =>
        i === idx
          ? incrementCartItem(item, p.qty, p.product.price)
          : item,
      );
    } else {
      cart = [...s.cart, candidate];
    }

    set({
      cart,
      sheet: null,
      pending: null,
      flash: "ok",
      toast: {
        msg: "Position hinzugefügt",
        note: `${p.product.sku} · ${p.qty} ${candidate.unitLabel}`,
      },
    });
    void persistAll(get);
  },

  discardUnknown: () =>
    set({ sheet: null, unknownCode: "", flash: null }),

  reportUnknown: () => {
    const code = get().unknownCode;
    set({
      sheet: null,
      unknownCode: "",
      flash: null,
      toast: { msg: "Zur Klärung gemeldet", note: code },
    });
  },

  removeCartItem: (id) => {
    set({ cart: get().cart.filter((c) => c.id !== id) });
    void persistAll(get);
  },

  requestSubmit: () => {
    const s = get();
    if (!s.cart.length) return;

    if (!s.authed || s.expired) {
      set({
        authStep: "reauth",
        toast: { msg: "Sitzung abgelaufen", note: "Warenkorb gesichert", tone: "err" },
      });
      return;
    }

    if (!s.online) {
      const t = cartTotals(s.cart);
      const entry: OutboxEntry = {
        id: newId(),
        no: "—",
        n: t.n,
        sum: t.sum,
        state: "pending",
        request: false,
        idempotencyKey: newId(),
        createdAt: new Date().toISOString(),
        customerId: shippingAddress(s.shippingAddresses, s.shippingAddressIdx).custnr,
      };
      set({
        outbox: [...s.outbox, entry],
        cart: [],
        view: "outbox",
        toast: {
          msg: "In Outbox gelegt",
          note: "Wird übertragen, sobald Netz verfügbar ist",
        },
      });
      void persistAll(get);
      return;
    }

    get().beginPendingSubmit();
  },

  acceptConflict: () => {
    const cart = get().cart.map((item) => {
      const newPrice = item.unitPrice * 1.062;
      return {
        ...item,
        unitPrice: newPrice,
        lineTotal: newPrice * item.qty * item.unitFactor,
      };
    });
    set({ cart, conflicts: [] });
    get().beginPendingSubmit();
  },

  cancelConflict: () => set({ view: null, conflicts: [] }),

  beginPendingSubmit: () => {
    const s = get();
    if (!s.cart.length) return;
    if (s.snack) return;

    const t = cartTotals(s.cart);
    const a = shippingAddress(s.shippingAddresses, s.shippingAddressIdx);
    const snapshot = s.cart.map((item) => ({ ...item }));
    const done: DoneRecap = {
      no: "—",
      request: false,
      n: t.n,
      sum: t.sum,
      custnr: a.custnr,
      name: a.name,
      company: a.company,
      site: a.site,
      userLabel: triggeredByLabel(
        s.billingCompany,
        s.userLabel || s.username || "Benutzer",
      ),
      roleLabel: ORDER_ROLE.label,
      status: "pending",
    };

    set({
      cart: [],
      sheet: null,
      view: "done",
      done,
      snack: {
        no: "—",
        n: t.n,
        sum: t.sum,
        seconds: 10,
        cart: snapshot,
        shippingAddressId: a.id && a.id !== "—" ? a.id : null,
      },
      toast: {
        msg: "Auftrag wird übermittelt",
        note: "Noch 10 Sekunden zum Abbrechen",
      },
    });
    void persistAll(get);
  },

  commitPendingOrder: async () => {
    const snack = get().snack;
    const done = get().done;
    if (!snack?.cart.length) return;
    if (snack.committing) return;

    set({
      snack: { ...snack, committing: true, seconds: 0 },
      done: done ? { ...done, status: "submitting" } : done,
      loading: true,
    });

    const cart = snack.cart;
    const deliveryAddressId = snack.shippingAddressId;

    try {
      const existing = await fetchShopBasket().catch(() => [] as ShopCartLine[]);
      if (existing.length) {
        await clearShopBasket(existing);
      }
      await addCartToShop(cart);
      const submitted = await submitOrderToShop({ deliveryAddressId });

      const a = shippingAddress(get().shippingAddresses, get().shippingAddressIdx);
      const entry: OutboxEntry = {
        id: newId(),
        no: submitted.number,
        n: snack.n,
        sum: snack.sum,
        state: "confirmed",
        request: false,
        idempotencyKey: newId(),
        createdAt: new Date().toISOString(),
        customerId: a.custnr,
      };
      const nextDone: DoneRecap = {
        no: submitted.number,
        request: false,
        n: snack.n,
        sum: snack.sum,
        custnr: a.custnr,
        name: a.name,
        company: a.company,
        site: a.site,
        userLabel: triggeredByLabel(
          get().billingCompany,
          get().userLabel || get().username || "Benutzer",
        ),
        roleLabel: ORDER_ROLE.label,
        status: "success",
      };
      set({
        loading: false,
        cart: [],
        snack: null,
        outbox: [...get().outbox, entry],
        view: "done",
        done: nextDone,
        toast: {
          msg: "Bestellung ausgelöst",
          note: `Auftrag ${submitted.number} · ${snack.n} Positionen`,
        },
      });
      void persistAll(get);
    } catch (err) {
      const message =
        err instanceof ShopApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Bestellung fehlgeschlagen.";
      const failedDone: DoneRecap = {
        ...(get().done ?? {
          no: "—",
          request: false,
          n: snack.n,
          sum: snack.sum,
          custnr: shippingAddress(get().shippingAddresses, get().shippingAddressIdx).custnr,
          name: "",
          company: "",
          site: "",
          userLabel: triggeredByLabel(
            get().billingCompany,
            get().userLabel || "Benutzer",
          ),
          roleLabel: ORDER_ROLE.label,
          status: "failed" as const,
        }),
        status: "failed",
        error: message,
        no: "—",
      };
      set({
        loading: false,
        snack: null,
        cart: cart.map((item) => ({ ...item })),
        view: "done",
        done: failedDone,
        toast: {
          msg: "Bestellung fehlgeschlagen",
          note: message,
          tone: "err",
        },
      });
      void persistAll(get);
    }
  },

  newScan: () => set({ view: null, done: null, sheet: null, snack: null }),

  clearFlash: () => set({ flash: null }),
  clearToast: () => set({ toast: null }),
  tickSnack: () => {
    const snack = get().snack;
    if (!snack || snack.committing) return;
    if (snack.seconds <= 1) {
      void get().commitPendingOrder();
      return;
    }
    set({ snack: { ...snack, seconds: snack.seconds - 1 } });
  },
  dismissSnack: () => set({ snack: null }),
  undoOrder: () => {
    const snack = get().snack;
    if (!snack || snack.committing) return;
    set({
      cart: snack.cart.map((item) => ({ ...item })),
      snack: null,
      view: null,
      done: null,
      toast: { msg: "Bestellung abgebrochen", note: "Warenkorb wiederhergestellt" },
    });
    void persistAll(get);
  },

  syncOutbox: () => {
    if (!get().online) return;
    const outbox = get().outbox.map((e) =>
      e.state === "pending" || e.state === "retry"
        ? { ...e, state: "confirmed" as const, no: e.no === "—" ? `MS-2026-${get().ordNo + 1}` : e.no }
        : e,
    );
    set({ outbox, toast: { msg: "Outbox synchronisiert" } });
    void persistAll(get);
  },

  persist: async () => persistAll(get),
}));

export function selectShippingAddress(state: AppState) {
  return shippingAddress(state.shippingAddresses, state.shippingAddressIdx);
}

let totalsCache: { n: number; sum: number; cart: CartItem[] | null } = {
  n: 0,
  sum: 0,
  cart: null,
};

export function selectTotals(state: AppState) {
  if (totalsCache.cart === state.cart) {
    return totalsCache;
  }
  const next = cartTotals(state.cart);
  totalsCache = { n: next.n, sum: next.sum, cart: state.cart };
  return totalsCache;
}
