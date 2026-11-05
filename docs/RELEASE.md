# Release guide

## 1. Build the web app

```bash
npm run install:all
npm test
npm run build            # client/dist
```

Host `client/dist` on HTTPS. Requirements: serve `index.html` for unknown paths (single-page app), serve `sw.js` and `manifest.webmanifest` without long caching, and allow POST to `/share-target` to reach the app (see below).

## 2. Android share target

The manifest declares a `share_target` with `POST /share-target`, accepting PNG, JPEG, and WebP. The service worker handles that POST, stores the image in a cache, and redirects to `/snap?shared=1`. This only appears in Android's share sheet after the app is installed as a PWA or TWA. It is implemented and type-checked but **needs a real Android device to confirm**.

## 3. Android package (Trusted Web Activity)

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://YOUR-HOST/manifest.webmanifest
bubblewrap build
```

Then host `/.well-known/assetlinks.json` with your signing certificate's SHA-256 fingerprint so the TWA runs fullscreen. Use Play App Signing.

## 4. Play Console

- Data safety form: Gastador collects no personal data on its servers. Purchase verification sends a purchase token to your verification endpoint. State that financial data stays on the device.
- Describe the app as a tracker; it is not connected to GCash or Maya.
- Set up the `gastador_lifetime` product (see `BILLING.md`).

## 5. Before every release

- `npm test` and `npm run build` pass.
- Install on a real Android phone. Check: onboarding, add expense with the keyboard open, snap from gallery and camera, share a screenshot from the gallery, airplane-mode launch, backup and restore.
- Bump `APP_VERSION` in `client/src/data/backup.ts` and `version` in `client/package.json`.
- If the IndexedDB structure changes, bump `DB_VERSION` in `client/src/data/db.ts`, add an upgrade step, and bump `BACKUP_FORMAT_VERSION` only if the backup shape changes (keep readers for older versions).

## Updating the OCR engine

The files under `client/public/tesseract/` are copied from `node_modules` on every build. Upgrading `tesseract.js` upgrades them. Re-test reading after an upgrade.
