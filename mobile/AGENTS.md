# Gastador UI/UX Engineering Skill

Apply these rules whenever changing Gastador's interface. Treat this as the product's design and implementation standard, not optional inspiration.

## Product
Gastador is an Android-first, local-first personal allowance and expense tracker for Filipino students. Its primary job is to answer: "How much of my allowance can I still spend?" Default currency is PHP. Existing budgeting, SQLite, backup, scan, and transaction behaviour must remain intact unless the task explicitly requests a functional change.

## Design identity
The user-approved visual reference is a warm orange wallet interface: a burnt-orange balance header, pale-yellow circular quick actions, a white lower content sheet with a soft curved top edge, compact transaction rows, and restrained white bottom navigation. Reproduce this composition closely across Gastador screens. Do not substitute a different design direction, add decorative gradients, or introduce generic dashboard cards. Gastador remains a student allowance tracker, not a cryptocurrency wallet; never add crypto assets, transfer, exchange, or withdrawal concepts from the reference.

## Colour tokens
Use semantic tokens from `src/constants/theme.ts` for interface colours:
- Canvas: `#FFF8F2`
- Surface: `#FFFFFF`
- Main text: `#292522`
- Secondary text: `#76675F`
- Muted text: `#9A8A80`
- Wallet orange: `#D96E4C`
- Pale-yellow action: `#F5D77A`
- Selected soft orange: `#FCE9DF`
- Divider: `#F0E2D8`
- Positive: `#56866A`
- Warning: `#9A682D`
- Negative: `#B64F45`

Keep light mode as the deliberate visual direction.

## Contrast and surface rules
- Every text element must be readable against its actual rendered background.
- Never use white text on pale blue, grey, or white surfaces.
- White text is reserved for the solid ledger-blue primary action.
- Selected controls use pale blue fill with dark blue text and a visible blue border.
- Disabled controls remain readable; use muted dark text, not low-opacity white.
- Inputs use a white surface, dark input text, muted placeholder, and visible divider border.
- Positive/negative amounts use their semantic colours and must not be the only indication of income/expense.
- Do not use hardcoded colour literals in screens when a theme token exists.
- For custom backgrounds, explicitly set the foreground text and icon colours in the same component.

## Layout and component language
- Prefer open ledger rows, meaningful section groupings, and thin dividers over repeated cards.
- Use a small radius scale consistently: 6 for controls, 8 for compact selections, 10-12 only for major surfaces.
- Use at least 44x44 dp for touch targets.
- Keep equal horizontal page insets and safe-area/keyboard clearance.
- The bottom navigation must remain legible over every page and must not cover scroll content.
- Use real category/product icons from the existing icon system; do not invent emoji or initial-letter icon tiles.
- Maintain typography using the bundled IBM Plex Sans family. Monetary figures may be larger/bolder but must remain legible and tabular where appropriate.
- Keep labels in sentence case. Use plain, task-oriented wording.

## Implementation rules
1. Inspect the current screen, shared components, theme tokens, and navigation before editing.
2. Trace colour inheritance through `ThemedText`, custom `Text`, buttons, selected states, and icons. Do not assume changing the page background fixes contrast.
3. Prefer fixing shared tokens/components over patching individual screens.
4. Preserve all existing data, database, navigation, validation, and transaction behaviour.
5. Do not create mock financial figures, fake transaction records, or placeholder controls in production screens.
6. Every interactive element needs a meaningful accessible label and state.
7. Respect Android back behaviour, safe areas, keyboard visibility, and reduced-motion preferences.
8. Do not claim that a UI fix works until TypeScript/lint checks and an Expo Go runtime check have been performed.

## Required QA for every UI change
- Run `npx tsc --noEmit` from `mobile/`.
- Run the app in Expo Go with a cleared Metro cache when styles or shared components change.
- Inspect screenshots at the narrowest supported device width and a typical Android phone size.
- Check every page, not just the page edited: Home, Activity, Insights, Scan, Settings, Add transaction, and Allowance setup.
- Check text on default, selected, disabled, error, success, and input states.
- Check navigation icons, labels, selected indicator, and scroll/keyboard overlap.
- Confirm that visible labels in the screenshot match the latest source before diagnosing a styling issue. If they do not, verify repository, branch, working directory, Metro server, and Expo Go connection before making more visual edits.
- Report what was actually tested. Clearly separate source inspection from runtime verification.

## Avoid
No decorative gradients, no arbitrary glow, no glass effects on every component, no identical card grids, no low-contrast grey-on-grey, no white-on-pale-blue labels, no scroll-triggered entrance animations, and no unnecessary UI changes that alter app behaviour.
