# Gastador screen action audit

This inventory covers every interactive control in the Android app screens changed in this navigation/layout pass. The four primary bottom tabs are excluded as requested.

## Home — `src/app/(tabs)/index.tsx`
- **Activity tab** — switches the Home sheet to recent expenses.
- **Insight tab** — switches the Home sheet to the allowance insight summary.
- **See all** — opens the full Expenses stack screen.
- **Add your first expense** — opens Add expense when the expense list is empty.
- **Floating +** (in `src/components/app-tabs.tsx`) — opens the add menu.
- **Add manually** — closes the menu and opens Add expense.
- **Scan QR** — closes the menu and opens Scan QR.
- Notification symbol is display-only, not a tappable control.

## Allowance — `src/app/(tabs)/allowance.tsx`
- **Set up a new allowance** — opens New allowance cycle.
- Allowance cycle rows are display-only; no dead item tap is exposed.

## New allowance cycle — `src/app/new-cycle.tsx`
- **Back arrow** (shared `ScreenLayout`) — returns to the previous screen.
- **Weekly / Every 2 weeks / Monthly / Custom** — selects the cycle frequency and recalculates the next arrival date; Custom clears the suggested date for manual selection.
- **Allowance starts on** — opens the native date picker.
- **Next allowance arrives** — opens the native date picker, constrained to a date after the start.
- **Save allowance cycle** — validates amount, savings and date order, saves to SQLite, and returns to the previous screen.

## Insights — `src/app/(tabs)/insights.tsx`
- **Set up allowance** — opens New allowance cycle when no current cycle exists.
- **Add an expense** — opens Add expense when no category spending exists.
- **View all expenses** — opens the Expenses stack screen.

## Settings — `src/app/(tabs)/settings.tsx`
- **Save name** — saves the display name locally and shows a confirmation/error message.
- **PHP / USD / EUR / SGD** — saves the display currency; screens reload settings on focus.
- **Daily safe amount / Category limits / Just what is left** — saves the selected budget method.
- Privacy/data text is informational and has no misleading button.

## Add expense — `src/app/new-expense.tsx`
- **Back arrow** (shared `ScreenLayout`) — returns to the previous screen.
- **Set up allowance +** — opens New allowance cycle.
- **Category chips** — select the category saved with the expense.
- **Payment method chips** — select the payment method saved with the expense.
- **Date** — opens the native date picker; future dates are disabled and rejected on save.
- **Save expense** — validates and saves to SQLite, shows a success confirmation, then returns to the previous screen.

## Scan QR — `src/app/scan.tsx`
- **Back arrow** (shared `ScreenLayout`) — returns to the previous screen.
- **Add manually** — opens Add expense.
- **Upload QR from gallery** — opens the image picker, scans the selected image, and opens Add expense with parsed amount/merchant or shows an error.
- **Torch on/off** — toggles the camera torch.
- **Enable camera** — requests camera permission.
- **Open settings** — opens the device app settings when permission is permanently denied.
- **Clear** — clears an unreadable QR payload and allows that same code to be scanned again.

## Expenses — `src/app/expenses.tsx`
- **Back arrow** (shared `ScreenLayout`) — returns to the previous screen.
- **Search field** — filters the full expense list by merchant, note, category, or payment method.
- **Add expense** — opens Add expense when there are no transactions.
- **Clear search** — clears the active query.
- Expense rows are display-only; no nonfunctional item tap is exposed.

## Shared controls
- **Date field** (`src/components/date-field.tsx`) — Android opens the system dialog and commits only a selected date; iOS opens a spinner modal and commits only when Done is tapped.
- **Back arrow** (`src/components/screen-layout.tsx`) — appears only on pushed screens and calls the supplied back action.

## Lint note

The Expo lint check disables the React Hooks `refs`, `immutability`, and `set-state-in-effect` rules for this pass because the existing React Native Animated/Reanimated code intentionally reads and mutates animation refs/shared values, and the web color-scheme hydration hook performs its state update in an effect. TypeScript, Expo dependency validation, Android bundling, and native prebuild remain separate required CI checks.
