# ₱99 lifetime unlock

**Status: the purchase flow is not live.** The code for the supported architecture is in place, but it cannot work until the app is distributed through Google Play and configured. Until then the unlock screen says "Not available in this build", the buy button is disabled, and no premium limit is enforced. Nothing unlocks because a button was tapped.

## Why a native wrapper is needed

Google Play Billing is only reachable from an Android app installed from Google Play. A plain website cannot sell through it. The supported route for a PWA is a **Trusted Web Activity (TWA)**, a thin Android wrapper (for example built with Bubblewrap) that loads the PWA. Inside a TWA, Chrome exposes the **Digital Goods API** and **Payment Request API** with the payment method `https://play.google.com/billing`. That is what `client/src/billing/providers.ts` calls.

## Trust model

The device is not trusted to say "I paid". The flow is:

1. App asks Play to buy product `gastador_lifetime` (a one-time, non-consumable in-app product priced at ₱99 in Play Console).
2. Play returns a **purchase token**.
3. The app sends only `{ productId, purchaseToken }` to `VITE_PLAY_VERIFY_URL`.
4. The server (`server/src/routes/billing.js`) asks the Google Play Developer API whether the token is a real purchase of that product, **acknowledges it** (unacknowledged purchases are refunded after three days), and answers `{ verified: true }` only when Google says so.
5. Only an explicit `verified: true` creates an entitlement with `source: 'play'` and a `verifiedAt` time. Anything else (network error, 4xx, 5xx, `verified: "true"`, missing field) leaves the app locked.

Financial records stay on the device. The server never sees expenses, cycles, or images, only a purchase token.

## Restore purchases

`listPurchases()` from the Digital Goods API returns the account's purchases; the app verifies the token the same way. Entitlements are stored in the `settings` store but are **excluded from backup files and never imported**, so a JSON file cannot grant access.

## Test mode

`VITE_BILLING_MODE=test` enables a clearly labelled test unlock for development. It is refused in production builds (`resolveKind` returns "none" when `import.meta.env.PROD`), and a test entitlement is never honoured in production even if one is present in storage. Both rules have unit tests.

## Configuration

Client (build time):

| Variable | Meaning |
| --- | --- |
| `VITE_BILLING_MODE` | `none` (default), `test` (development only), or `play` |
| `VITE_PLAY_VERIFY_URL` | Full URL of the verification endpoint, for example `https://api.example.com/api/billing/verify` |

Server:

| Variable | Meaning |
| --- | --- |
| `PLAY_PACKAGE_NAME` | Your Android package name, for example `ph.gastador.app` |
| `PLAY_SERVICE_ACCOUNT_JSON` | The service-account JSON (as a string) that has access to the Play Developer API for this app |

Without both, the endpoint answers 503 `not_configured` and verifies nothing.

## What a free user gets

Defined in `client/src/billing/features.ts`:

| Feature | Free | Unlocked |
| --- | --- | --- |
| Tracking by hand, backup, CSV export, all data | Unlimited | Unlimited |
| Snap imports | 10 per allowance cycle | Unlimited |
| Insights range | 31 days | Any |
| Savings goals | 2 | Unlimited |

**These limits are a product assumption, not something requested explicitly. Change the numbers or the gated features in that one file.** Limits apply only when a billing provider is configured, so a build that cannot sell never locks anyone out. Existing data is never hidden or deleted by the limits; they only stop *creating* more.

## Setup checklist (all require external accounts)

1. Create the app in Google Play Console and a one-time product `gastador_lifetime`, priced ₱99.
2. Build the TWA, publish to an internal test track, and verify Digital Goods is available.
3. Create a service account, grant it access to the Play Developer API for the app, and set the server variables.
4. Host the verification endpoint over HTTPS and build the client with `VITE_BILLING_MODE=play` and `VITE_PLAY_VERIFY_URL`.
5. Test with licence testers: purchase, cancel, refund, restore on a second device.

None of steps 1 to 5 could be done or tested in this repository.
