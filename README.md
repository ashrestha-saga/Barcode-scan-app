# ScanOrder (web)

Mobile-first PWA for med-sales ScanOrder — Next.js implementation of Phases 0–4 from `../SCANORDER_Implementation_Plan.md`.

## Run

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
src/app/                    routes (`/` scanner, `/auth/callback`, `/api/*` BFF)
src/components/ui/          shared UI (toast, snack, keypad, loading)
src/components/features/    auth, scan, cart overlays
src/components/hooks/       feature hooks
src/hooks/                  app-wide hooks
src/constants/              roles, demo catalog
src/interfaces/             TypeScript types
src/lib/                    GS1, cart, expiry, IndexedDB, token storage
src/services/               shop HTTP + OAuth + product resolve
src/store/                  Zustand
```

Screen flow: OAuth login → optional delivery-address pick → scanner overlays on `/`.

## Login (OAuth 2.0)

```
Anmelden → shop ?cl=oauthauthorize (PKCE)
  → /auth/callback?code
  → POST /api/auth/token (server adds client_secret)
  → GET /api/auth/me
  → sessionStorage access_token
Scan → POST /api/articles with the same Bearer token
  → shop ?cl=articleapi&fnc=getArticles
    camera: { "oxean": ["…"] }
    Nummer → EAN: { "oxean": ["…"] }
    Nummer → Artikelnummer: { "oxartnum": ["…"] }
```

Copy `web/.env.example` to `web/.env.local` and set `NEXT_PUBLIC_OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET`. Register redirect URIs `http://localhost:3000/auth/callback` and the Vercel origin `/auth/callback` on the OXID OAuth client (scopes `profile address api`). Local HTTP needs `mwv_oauthAllowLocalHttp` on the shop.

## Demo flow

1. **Mit Shop anmelden** (OAuth) → optional Lieferadresse → scanner
2. Tap a **demo chip** (or **Nummer**) to resolve a product
3. Set quantity → **In den Warenkorb**
4. Open cart → role CTA (`Jetzt bestellen` / `Zur Freigabe senden`)
5. Besteller/Freigeber: PIN **1234**

### Dev controls (bottom strip)

| Control | Effect |
|---------|--------|
| erfasser / besteller / freigeber | Role |
| offline | Amber net bar + outbox path |
| preis± | Price conflict on submit |
| lot:ok/warn/bad | UDI expiry scenario |
| session↓ | Session expiry (cart kept) |
| outbox | Outbox view |

## Stack

- Next.js App Router + TypeScript
- Zustand + IndexedDB (`idb`) for cart/session/outbox drafts
- Design tokens from `scanorder-mockup-v4.html`

## Scripts

```bash
npm run dev
npm run build
npm test
npm run lint
```
