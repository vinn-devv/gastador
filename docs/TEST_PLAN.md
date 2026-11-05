# Test plan

## Automated (run with `npm test`)

Client, Vitest, 113 tests, fake IndexedDB, timezone forced to America/Los_Angeles to prove Manila date handling does not depend on the device:

| Area | File |
| --- | --- |
| Money parsing, formatting, integer division, rounding | `domain/money.test.ts` |
| Manila dates, inclusive days, month clamping, legacy server dates | `domain/dates.test.ts` |
| Remaining balance, daily limit, future, expired, zero days, negative balance, overlap, expense moving between cycles, current-cycle choice, carryover | `domain/allowance.test.ts` |
| Duplicate detection, CSV export and formula-injection guard | `domain/duplicates.test.ts` |
| Insights series, alerts and neutral wording | `domain/insights.test.ts` |
| Transaction CRUD, validation, categories, cycles, savings separation, receipts, settings, persistence after reload | `data/repo.test.ts` |
| Backup round trip, replace and merge, validation, atomic failure, migration from a real old-server export (twice-safe, timezone variants, categories) | `data/backup.test.ts` |
| OCR text parsing for GCash, Maya, paper receipts, noisy text, confidence | `ocr/parse.test.ts` |
| Image preparation | `ocr/preprocess.test.ts` |
| Unlock policy, production test-mode refusal, verification only on explicit `verified: true` | `billing/billing.test.ts` |

Server, `node --test`, 11 tests, no database needed: money and dates, DATE parsing, Play verification (configuration, JWT signing, not configured, bad input, purchased and acknowledged, cancelled, outage).

Type checks: `npm run typecheck` (app and service worker).

## Verified in a real browser (headless Chromium via scripts, not shipped)

- Restore a backup from the onboarding screen; remaining and daily amounts match hand calculation (₱144.00 and ₱20.57 for 7 remaining days).
- Add, duplicate warning with "Save anyway", move an expense to a date outside every cycle, delete.
- Overlapping cycle rejected with a message; adjacent cycle with carryover saved.
- Dark theme applies and persists after reload.
- Reload while offline renders Home with data. OCR runs offline.
- OCR on a generated GCash-style image read amount 350.00, recipient, date and time correctly with no request leaving localhost; engine files appear in the `gastador-ocr-v1` cache.
- Migration: sign in to the real old server (PostgreSQL 16) from the new app, preview counts, import, confirm balances and categories.
- Layout sweep at 320, 360, 375, 390, 430, 768, and 1280 px across 15 screens: no horizontal overflow, bottom navigation never covers content (main area padding equals navigation height), no console errors.

## Manual checklist for a real Android phone (not done here)

- Install as PWA from Chrome; confirm the icon and standalone display.
- Share a GCash screenshot from the gallery to Gastador (share target).
- Camera capture with `capture="environment"`.
- Keyboard open on the add-expense form: amount stays visible and the Save bar sits above the keyboard.
- Airplane-mode launch after first use.
- Back and restore of a backup file through the Android file picker.
- Real receipts and screenshots from several phones to judge OCR quality.
- TalkBack pass on Home, Activity, and the confirm screen.
