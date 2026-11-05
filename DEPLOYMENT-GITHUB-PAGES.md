# Deploy Gastador to GitHub Pages

This repository publishes the React/Vite PWA from `client/` to:

https://vinn-devv.github.io/gastador/

## Automatic deployment

1. Push the project to the `main` branch of `vinn-devv/gastador`.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Open the **Actions** tab and wait for **Deploy Gastador to GitHub Pages** to finish successfully.
5. Visit https://vinn-devv.github.io/gastador/ over HTTPS.

Every subsequent push to `main` automatically rebuilds and republishes the app.

## Notes

- GitHub Pages hosts the static frontend only. Gastador's local-first finance features use IndexedDB in the user's browser/device; they do not require the legacy Express/PostgreSQL server.
- The legacy server and Google Play purchase-verification endpoint are not deployed by GitHub Pages. Configure a separate backend before enabling live purchase verification.
- After opening the site on Android Chrome, use **Install app** / **Add to Home screen**. The service worker caches the app shell and OCR assets for offline use after the first successful online load.
- Financial records remain on that device/browser. Export a backup regularly; uninstalling or clearing browser storage can erase local data.
