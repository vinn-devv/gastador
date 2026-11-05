# Gastador branding and motion

## Brand assets

- `client/public/gastador-logo.png` — transparent horizontal lockup for light surfaces.
- `client/public/gastador-logo-dark.png` — same lockup adapted for dark surfaces.
- `client/public/icon-192.png`, `icon-512.png` — PWA / launcher artwork based on the supplied Gastador mark.
- `client/public/icon-maskable-512.png` — solid-background maskable launcher artwork.

The transparent horizontal lockup is the source of truth. Keep the peso symbol white inside the navy icon; transparency applies to the canvas around the artwork, not to intentional white logo details.

## Motion principles

- Launch reveal: icon pop, controlled zoom/fade, then wordmark reveal; approximately 1.7 seconds with a skip control.
- Route changes: short fade/translate entrance.
- Primary actions: subtle press feedback.
- Financial values: brief value-change entrance; progress bars already animate width changes.
- Sheets and toasts: short entrance transitions.
- `prefers-reduced-motion` is respected globally.

Keep motion purposeful and avoid adding animation to every element. Preserve the existing local-first data, backup, and offline behavior when changing UI code.
