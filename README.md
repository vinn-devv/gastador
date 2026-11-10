# Gastador

**A local-first personal allowance and expense tracker for Android.**

Gastador helps students manage their allowance, record expenses, review spending insights, and keep track of savings goals. Data is stored locally on the device.

## Project

The current application is the Expo / React Native Android app in [mobile/](mobile/).

- **Framework:** Expo, React Native, TypeScript
- **Navigation:** Expo Router
- **Storage:** SQLite (local-first)
- **Currency:** Philippine peso (PHP)

## Run locally

Requires Node.js and npm.

```bash
cd mobile
npm install
npx expo start
```

For an Android development build, follow the Expo documentation and the app's EAS configuration.

## Build an installable Android APK

The EAS configuration in mobile/eas.json includes APK build profiles.

```bash
cd mobile
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

Download the APK from the EAS build page when the cloud build completes. The installed app runs independently; it does not require Expo Go or a running development server.

## Repository structure

- mobile/src/app/ — application routes and screens
- mobile/src/components/ — reusable UI components
- mobile/src/data/ — SQLite database and repositories
- mobile/src/domain/ — allowance, expense, and business logic
- mobile/assets/ — application images and animations

## Notes

Gastador is local-first. Each installation keeps its own data on its device. Users should make backups before uninstalling or changing devices.