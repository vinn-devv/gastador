# Gastador branding and motion

## Brand assets

- `client/public/gastador-mark.svg` — square Gastador icon used by the launch intro and app mark.
- `client/public/icon-192.png`, `icon-512.png` — PWA / launcher artwork based on the supplied Gastador mark.
- `client/public/icon-maskable-512.png` — solid-background maskable launcher artwork.

The peso symbol remains white inside the blue icon. The yellow L-shaped corner accents belong inside the icon tile, never outside its silhouette.

## Launch intro

- Runs once on app launch, not on route changes.
- Intro stays visible for approximately 6.85 seconds including the exit fade.
- The icon performs one short bounce on entry.
- The wordmark and tagline appear only after the icon bounce finishes.
- Four yellow corner accents sit inside the blue icon tile.
- No scan line, scanning effect, floating coins, Lottie decoration, particles, halo animation, or ambient intro animation.
- A Skip control remains available.
- `prefers-reduced-motion` is respected.

## Motion principles

Keep the launch reveal limited to the icon bounce followed by the brand text reveal. Route changes, primary actions, sheets, and toasts may use brief functional transitions, but do not add decorative motion to the intro. Preserve the existing local-first data, backup, and offline behavior when changing UI code.
