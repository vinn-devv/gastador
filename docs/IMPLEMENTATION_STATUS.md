# Implementation status

## Implemented and tested

- Local-first storage in IndexedDB behind a repository layer; no login, no cloud database.
- Allowance cycles (weekly, biweekly, monthly, custom), carryover, planned savings, optional per-category limits, overlap protection, Asia/Manila dates, integer centavos.
- Home: remaining amount, cycle dates, allowance, spent, safe daily amount, days left, progress, daily strip, recent expenses, category summary, notes.
- Activity: search, filters, sorting, add, edit, delete, categories, payment methods, notes, receipt attachment, manual splurge tag.
- Snap: gallery or camera, trim, on-device OCR, confirmation with confidence notes, duplicate detection, correction, save only after confirm.
- Insights: ranges, daily, weekly, monthly series, category and method breakdowns, tagged splurges, recent cycles. Custom SVG charts with table alternatives.
- Savings goals and contributions, separate from expenses.
- Backup and restore: versioned JSON (optionally with images), CSV export, replace or merge, atomic and validated.
- Migration from the old online account: direct sign-in import or file import, tested against a real export.
- Offline: precached shell, offline OCR, offline banner.
- Light and dark themes, responsive layout from 320 px to desktop, bottom navigation on phones, side rail on larger screens.

## Implemented but needs external setup or a real device

| Item | Why it could not be verified here |
| --- | --- |
| Google Play purchase (Digital Goods and Payment Request calls in `billing/providers.ts`) | Needs a Play Console app, a TWA build on Android, licence testers |
| Server purchase verification against Google (`server/src/billing/playVerify.js`) | Needs a Play service account. Everything except the live Google calls is unit tested with a fake fetch |
| Android share target | Needs the app installed as a PWA or TWA on an Android phone. Service worker code compiles; the flow was not run |
| Camera capture | The attribute is set; a headless browser has no camera |
| OCR accuracy on real phones | Verified on one generated image. Real screenshots and paper receipts vary and will sometimes be misread; the UI says so |
| Android keyboard behaviour | `interactive-widget=resizes-content` and a sticky bar are used; needs device confirmation |

## Product assumptions to confirm

- **Free limits for the unlock** (10 Snap imports per cycle, 31 days of Insights, 2 savings goals) were chosen by me. Edit `billing/features.ts`. They only apply when billing is configured.
- Currency choice keeps PHP, USD, EUR, and SGD only. The old JPY option is dropped because amounts are stored in hundredths. Old JPY users are warned on import.
- The old `Savings` category is not imported; its purpose moved to savings goals.
- Monthly cycles now end the day before the same date next month. The old app used a fixed 30 days.
- In-app alerts replace nothing push-based; there are no push notifications.

## Known limits

- IndexedDB data is not encrypted by Gastador and can be cleared by the browser or OS. This is stated in the app.
- Receipt images and OCR text exist only on the device, so there is no cloud recovery.
- Only English text is read. Filipino text and handwriting will be weak.
- No automatic backups. The user must download them.
- Insights charts are simple on purpose; no zoom or export.
- The old server and database remain in the repository until you retire them.

## Removed

- Recharts (replaced by small SVG charts).
- The cookie-session login screens and API client from the client app (the server code remains).
