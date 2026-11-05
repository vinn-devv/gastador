# Design notes

Gastador should feel like a calm, familiar Philippine wallet app made for students, not an admin dashboard. It is a product UI, so familiar patterns beat novelty.

## Identity

- **Colour.** Refined navy primary (`#173A9C` light, `#7FA2FF` dark), deep navy for the balance panel, a restrained mint (`#5FE0C0`) used for the Snap action and progress, warm neutral background (`#F5F2EC`). Tokens are CSS variables in `client/src/index.css`, mapped in `tailwind.config.js`, with a full dark theme.
- **Type.** IBM Plex Sans (self-hosted via Fontsource, so it works offline), tabular figures for every peso amount.
- **Shape.** Radii of 12 px for controls and 16 px for cards. Cards use borders, not shadows. Shadow is reserved for the raised Snap button and sheets.
- **Icons.** Lucide only, one stroke weight, no emoji.
- **Motion.** Short ease-out transitions (150 to 240 ms). Sheets slide up, toasts rise. Everything is disabled under `prefers-reduced-motion`.
- Not copied: GCash's logo, colours, layouts, or illustrations.

## Layout

- Phones: bottom navigation with five items (Home, Activity, Snap, Insights, Settings). Snap is the raised centre action. Forms hide the bar and use a sticky action bar that respects the keyboard (`interactive-widget=resizes-content`) and safe areas.
- Tablets and desktop: a left rail with the same five destinations, content up to 1024 px, a two-column Home.
- Touch targets are at least 44 px. Inputs are 48 px.

## Home

The remaining amount leads, inside a navy panel with progress, the safe daily amount, and days left. Under the figures, a slim per-day strip shows daily spending against the planned amount. Snap receipt and Add expense are the two actions. Notes (alerts) sit below them so they never push the balance off screen.

## Language

Neutral and factual. "Spending is above the planned daily pace", never "overspending" or "careless". Splurge is a label the user applies. Reading errors are admitted: "reading can make mistakes".

## Patterns deliberately avoided

Gradients, glass effects, oversized hero cards, nested cards, decorative charts, random emoji, modal-first flows for long forms, and skeletons for anything that is not genuinely loading.

## Accessibility

Visible focus rings, labelled inputs with linked errors, `role="alert"` on errors, a table alternative under each chart, `aria-pressed` and `role="radio"` on chips, native `<dialog>` for sheets (focus trap and Escape for free), and text contrast checked against the tokens.
