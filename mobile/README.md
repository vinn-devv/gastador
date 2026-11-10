# Gastador Mobile

Gastador is an Android-first, local-first allowance and expense tracker designed to help students manage their money in Philippine pesos.

## Features

- Allowance cycles: weekly, every two weeks, monthly, or custom
- Expense recording with categories, dates, and payment methods
- Balance tracking with protection against expenses that exceed the remaining allowance
- Activity history and spending insights
- QR scanning and QR image selection
- Custom expense categories and payment methods
- Display preferences for currency, number format, dates, and text size
- Local SQLite storage

## Requirements

- Node.js and npm
- Android device or emulator
- Expo Go for compatible development previews, or an installed development build

## Run locally

From the repository root:

```bash
cd mobile
npm install
npx expo start
```

To clear Metro's cache when troubleshooting a stale development bundle:

```bash
npx expo start -c
```

## Run checks

```bash
npx tsc --noEmit
npm test
npm run lint
```

## Build an installable Android APK

The EAS preview and production profiles are configured to produce APK files.

```bash
cd mobile
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

Use the production profile when preparing a production release:

```bash
npx eas-cli build --platform android --profile production
```

Download the finished APK from the [Expo EAS dashboard](https://expo.dev/). The installed APK runs independently of Expo Go and the Metro development server.

## Project structure

```
mobile/
├── assets/       App artwork and animations
├── scripts/      Project maintenance scripts
└── src/
    ├── app/      Expo Router screens and routes
    ├── components/
    ├── constants/
    ├── data/     SQLite schema and repositories
    ├── domain/   Allowance, expense, date, and money logic
    ├── hooks/
    └── types/
```

## Data storage

Gastador stores app data locally on each device using SQLite. Separate installations do not automatically share or synchronize their data. Back up important information before uninstalling the app, clearing its storage, or changing devices.

## Notes

- The app's Android application ID is `com.gastador.mobile`.
- The Expo app configuration is in `app.json`.
- Android build profiles are in `eas.json`.
