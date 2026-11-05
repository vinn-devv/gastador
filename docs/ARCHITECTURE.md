# Architecture

## Overview

Gastador is a static, offline-capable single-page app. All financial data lives in the browser's IndexedDB. There is no required backend.

```
client/src
  domain/    Pure logic: money (integer centavos), Manila dates, allowance cycles, duplicates, insights, alerts, CSV
  data/      IndexedDB access (db.ts), repository + validation (repo.ts), backup/restore (backup.ts), old-account migration (legacy.ts)
  ocr/       Text parsing with confidence (parse.ts), image preparation, Tesseract wrapper that loads only self-hosted files
  billing/   Provider interface, unlock policy, entitlement store
  app/       React providers (data, billing) and the app shell
  components/, pages/   UI
  sw/        Service worker: precache, OCR file cache, Android share target
```

Dependencies point inward: UI imports data and domain; data imports domain; domain imports nothing from the app. That is why the allowance maths and parsers have fast unit tests that need no browser.

## Data model (IndexedDB database `gastador`, version 1)

| Store | Key | Notes |
| --- | --- | --- |
| `settings` | `key` | `app` (preferences), `entitlement` (purchase state), small meta flags |
| `categories` | `id` | Archived, never hard-deleted, so old expenses keep their category |
| `cycles` | `id` | `startDate` and `endDate` are inclusive `YYYY-MM-DD` Manila dates |
| `cycleLimits` | `cycleId:categoryId` | Optional per-cycle category limits |
| `transactions` | `id` | Index on `date`. Stores `amountCentavos` (integer), `occurredAt` (ISO instant) and derived `date` (Manila) |
| `goals`, `contributions` | `id` | Savings. Never counted as expenses |
| `receipts` | `hash` (SHA-256) | Image bytes and MIME type, deduplicated |

Cycle membership is **derived** from an expense's date. Nothing stores which cycle an expense belongs to, so editing an expense into another cycle just works.

## Repository layer

`data/repo.ts` is the only code that writes. It validates input, normalises text, enforces rules (no overlapping cycles, at least one active category, archived categories not selectable), and emits change events. A BroadcastChannel keeps several open tabs in sync. Multi-record writes (restore, wipe) run in one IndexedDB transaction, so a failure leaves existing data untouched.

## Money and dates

Money is integer centavos everywhere. `parseMoney` parses strings by digits, never through floats. Divisions are integer floor or half-up. Dates are `YYYY-MM-DD` strings; the Manila calendar day of an instant is computed with a fixed UTC+8 offset, which is exact for Asia/Manila since there has been no daylight saving there for decades, and is independent of the phone's timezone. Tests run under a Los Angeles timezone to prove this.

## Receipt OCR

1. The user picks an image (gallery, camera, or Android share).
2. It is trimmed, scaled to at most 1600 px, converted to greyscale with a contrast stretch, and read by Tesseract.js in a worker.
3. `ocr/parse.ts` extracts amount, merchant, date and time, payment provider, and reference, each with a confidence of high, medium, or low, or marked missing.
4. A confirmation screen shows every field for correction, flags uncertain ones, warns about duplicates, and saves only on confirm. The image is stored locally only if saved.

Worker, WebAssembly core, and English language data are copied from `node_modules` into `client/public/tesseract/` at build time (`scripts/copy-ocr-assets.mjs`) and served from the app's own origin. The service worker caches them on first use; **Download now** on the Snap screen prefetches them. No third-party CDN is contacted.

## Offline

The service worker precaches the app shell. Navigations fall back to `index.html`. OCR files use a cache-first route. Verified in a real browser: reload while offline renders the app with its data, and OCR runs offline.

## Privacy boundaries

- Nothing financial leaves the device unless the user downloads a backup or CSV.
- Entitlements are excluded from backups and never imported, so editing a JSON file cannot unlock the app.
- Test-mode purchases are refused in production builds.

## The old server

`server/` is unchanged apart from two additions: DATE columns now return plain `YYYY-MM-DD` strings (the old behaviour shifted dates with the server's timezone), and an optional `/api/billing/verify` endpoint. It is not needed to run the app. Remove it only after your users have migrated.
