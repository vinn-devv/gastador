# Gastador Mobile Engineering Notes

Use these standards when changing the Gastador mobile app. Preserve established product behaviour and the current visual language unless a task explicitly requests a change.

## Product

Gastador is an Android-first, local-first allowance and expense tracker for students. Its primary job is to answer: "How much of my allowance can I still spend?" The default currency is PHP. Allowance, transaction, savings, scan, settings, and SQLite behaviour must remain intact unless the task explicitly requests a functional change.

## Design direction

- Keep the interface premium, clear, compact, and mobile-first.
- Use the established blue, light-blue, off-white, and navy palette.
- Preserve the current Home composition, floating glass tab navigation, screen transitions, and Nunito typography where already used.
- Avoid generic dashboard card grids, excessive information, decorative effects that compete with content, and unnecessary redesigns.
- Gastador is a student allowance tracker, not a cryptocurrency wallet. Do not add crypto assets, transfers, exchanges, or withdrawals.
- Use plain, task-oriented wording and sentence-case labels.

## Colour and readability

- Prefer semantic tokens from `src/constants/theme.ts` when they represent the intended colour.
- Keep text readable against its actual rendered background.
- White text is reserved for sufficiently dark blue surfaces and primary actions.
- Selected controls need clear contrast and a visible selected state.
- Inputs need readable text, muted placeholders, and a visible boundary.
- Positive and negative amounts use semantic colours, but colour must not be the only indication of meaning.
- When using a custom background, explicitly set foreground text and icon colours in the same component.

## Layout and interaction

- Prefer clear section groupings, compact rows, and restrained dividers over repeated cards.
- Keep touch targets comfortable and provide safe-area and keyboard clearance.
- Ensure bottom navigation does not cover scroll content.
- Preserve the established icon system; do not replace icons with emoji or arbitrary letter tiles.
- Every interactive element needs a meaningful action, accessible label, and visible state.
- Preserve Android back behaviour, navigation, and reduced-motion considerations.

## Implementation rules

1. Inspect the current screen, shared components, theme tokens, and navigation before editing.
2. Trace colour inheritance through shared text, buttons, selected states, and icons.
3. Prefer fixing shared tokens or components over patching multiple screens independently.
4. Preserve database schema, existing user data, validation, navigation, and transaction behaviour unless explicitly requested.
5. Do not add mock financial figures, fake transactions, or placeholder controls to production screens.
6. Keep React Compiler compatibility. For Reanimated shared values, use the supported setter APIs rather than direct mutation where required by the compiler.
7. Do not read or write refs during render.
8. Keep documentation aligned with the actual routes, features, scripts, and EAS build profiles.

## Required verification

For code changes, run the checks that are available and relevant from the `mobile/` directory:

```bash
npx tsc --noEmit
npm test
npm run lint
```

For UI or native changes, also start the app with a cleared Metro cache and inspect the affected screen on an Android device or emulator. Check related navigation, keyboard behaviour, safe areas, and loading/empty/error states.

Report only checks that were actually completed. Source inspection is not the same as runtime verification.

## Avoid

Avoid unnecessary changes to working flows, low-contrast text, excessive cards, over-animated transitions, arbitrary glow, decorative gradients, emoji replacing interface icons, and visual changes that alter app behaviour without being requested.
