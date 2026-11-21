# Gastador Mobile

Gastador is an Android-first, local-first allowance and expense tracker designed to help students manage their money in Philippine pesos.

## Features

- Allowance cycles: weekly, every two weeks, monthly, or custom
- Expense recording with categories, dates, and payment methods
- Balance tracking with protection against expenses that exceed the remaining allowance
- Activity history and spending insights
- QR scanning and QR image selection
- Receipt scanning with on-device OCR
- Custom expense categories and payment methods
- Display preferences for currency, number format, dates, and text size
- Local SQLite storage

## Requirements

- Node.js and npm
- Android device or emulator
- Expo development build for native features such as receipt OCR

**Important:** Expo Go does not include the native `ExpoOcrKit` module. Receipt scanning will fail in Expo Go. Use the custom Android build steps below instead.

## Run locally

From the repository root:

```bash
cd mobile
npm install
npx expo run:android
```

`npx expo run:android` generates/updates the native Android project from `app.json`, compiles the app with native modules (including `expo-ocr-kit`), installs it on the connected emulator/device, and starts Metro. Keep using the installed Gastador app rather than opening the project in Expo Go.

For subsequent JavaScript-only development sessions, start Metro for the installed native app with:

```bash
npx expo start --dev-client
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

The EAS `development`, `preview`, and `production` profiles produce installable APKs. The development and preview profiles are for internal testing; they include the native modules configured in `app.json`.

Build an internal development APK:

```bash
cd mobile
npx eas-cli login
npx eas-cli build --platform android --profile development
```

Use the preview profile for a shareable internal test APK:

```bash
npx eas-cli build --platform android --profile preview
```

Use the production profile when preparing a production release:

```bash
npx eas-cli build --platform android --profile production
```

Install the resulting APK from the [Expo EAS dashboard](https://expo.dev/). It runs independently of Expo Go and the Metro development server.

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
- The `expo-ocr-kit` config plugin is registered in `app.json`; native changes require a rebuilt Android app.
- Android build profiles are in `eas.json`.
