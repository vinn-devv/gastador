# Gastador mobile route and interaction inventory

This document is a source-level inventory of the current mobile routes and primary actions. It should be updated whenever navigation or screen behaviour changes. It is not a substitute for device testing.

## Main navigation

The custom bottom navigation exposes four tabs:

- **Home** — allowance overview, recent activity and the compact insight summary.
- **Activity** — complete expense history with search and an empty state that links to Add expense.
- **Insights** — detailed spending summaries and category breakdowns.
- **Settings** — app preferences, expense categories, payment methods, and app information.

The floating **+** action opens the quick-action menu:

- **Scan QR** — opens the Scan screen.
- **Add expense** — opens the manual expense form.
- **Add allowance** — opens allowance management.

## Additional routes

- **Allowance** — lists allowance cycles and opens the new-cycle form.
- **New allowance cycle** — creates a weekly, biweekly, monthly, or custom allowance cycle.
- **Add expense** — records an expense with its amount, category, date, and payment method.
- **Scan** — requests camera access, scans supported QR codes, and can open the image picker for a QR image.
- **Expenses** — expense-history route used by Activity and Home shortcuts.
- **How Gastador works** — explains the main allowance and expense workflows.

## Settings

The Settings screen currently includes:

- Currency selection and display preferences for number format, symbol placement, decimals, date format, week start, and text size.
- Expense category management.
- Custom payment-method management.
- Default category and payment-method preferences.
- App guide and open-source license information.

## Data and validation

- App data is stored locally with Expo SQLite.
- Allowance cycles and transactions are loaded from the local repositories.
- Expense creation validates the amount against the remaining allowance so the balance cannot be pushed below zero.
- Allowance cycle date conflicts can be flagged for review.

## Maintenance

When a screen or action changes, verify the route implementation and update this inventory. Run TypeScript and automated tests after code changes. Perform a separate Android runtime check for UI, camera, navigation, keyboard, and safe-area behaviour.
