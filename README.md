# Gastador

**Snap it. Track it. Stretch it.**

Gastador helps Filipino college students make a weekly, biweekly, or monthly allowance last. It shows what is left, a safe amount to spend each day, and reads GCash, Maya, and paper receipts on the phone itself.

- One-time ₱99 lifetime unlock. No subscriptions, ads, loans, or buy-now-pay-later.
- **Local-first:** expenses, allowance cycles, categories, savings goals, receipt images, and preferences are stored on the device in IndexedDB. There is no account and no cloud database.
- **On-device OCR:** Tesseract.js runs in the browser. The engine and English language file are served with the app and cached for offline use. Images and recognised text are never uploaded.
- Android-first installable PWA that also works on tablets and desktop.

## What is in this repository

| Folder | Purpose |
| --- | --- |
| `client/` | The app: React 18, TypeScript, Vite, Tailwind. This is all a normal user needs. |
| `server/` | The previous Express and PostgreSQL backend. Kept so existing users can migrate (see `docs/MIGRATION.md`). Also hosts an optional Google Play purchase verification endpoint (see `docs/BILLING.md`). |
| `docs/` | Architecture, allowance rules, migration, billing, release, design, test plan, and honest status. |

## Deploy to GitHub Pages

The public demo is configured for `https://vinn-devv.github.io/gastador/`. Push to `main` and enable **Settings → Pages → Build and deployment → Source → GitHub Actions**. The workflow in `.github/workflows/deploy-pages.yml` builds the PWA from `client/` and publishes it automatically. See [DEPLOYMENT-GITHUB-PAGES.md](DEPLOYMENT-GITHUB-PAGES.md) for the full steps and hosting limitations.

## Run it

Requires Node.js 20 or later.

```bash
npm run install:all
npm run dev          # http://localhost:5173
```

Production build and local preview:

```bash
npm run build        # type-checks, builds the PWA into client/dist
npm run preview      # http://localhost:4173
```

Tests (113 client tests, 11 server tests; the server tests need no database):

```bash
npm test
```

`client/dist` is a static site. Host it on any HTTPS static host. The service worker, camera access, share target, and image hashing all require HTTPS (localhost counts as secure).

## Optional: the old server

Only needed to migrate people who used the old email-and-password version.

```bash
cp server/.env.example server/.env     # set DATABASE_URL
npm run migrate
npm run dev:server
```

Then open the new app from the same address that serves the old API (the Vite dev and preview servers proxy `/api` to `localhost:4000`), choose **I already have data to bring over**, and sign in to import. Full steps and caveats are in `docs/MIGRATION.md`.

## Privacy in plain words

- Records live in this browser or app on this device. Clearing app or browser data, uninstalling, or losing the phone can erase them. Settings, then Backup and restore, downloads a versioned JSON backup (optionally with receipt images) and a CSV of expenses.
- Gastador does not encrypt the stored data and does not claim to. The phone's own lock and storage protection apply, and backup files are plain text.
- The only network use by design: loading the app itself, and (for a Play purchase) sending the purchase token to the verification endpoint.

## Honest limits

- OCR is best-effort. Every field is shown for confirmation with a confidence note, and nothing is saved until the user confirms.
- Android share-target import needs the app installed as a PWA from Chrome on Android; it was not testable here (see `docs/IMPLEMENTATION_STATUS.md`).
- The ₱99 purchase is not live until Google Play Billing is configured. Until then the unlock screen says so and no premium limits are enforced. See `docs/BILLING.md`.

Docs: `docs/ARCHITECTURE.md`, `docs/ALLOWANCE_LOGIC.md`, `docs/MIGRATION.md`, `docs/BILLING.md`, `docs/RELEASE.md`, `docs/DESIGN.md`, `docs/TEST_PLAN.md`, `docs/IMPLEMENTATION_STATUS.md`.
