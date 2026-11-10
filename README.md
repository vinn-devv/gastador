<div align="center">

  <h1>Gastador</h1>
  <p><strong>Your allowance, under control.</strong></p>
  <p>A simple, local-first allowance and expense tracker made for students.</p>

  <p>
    <img src="https://img.shields.io/badge/Platform-Android-2563EB?style=for-the-badge&logo=android&logoColor=white" alt="Android" />
    <img src="https://img.shields.io/badge/Built%20with-Expo-111827?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
    <img src="https://img.shields.io/badge/React%20Native-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="React Native and TypeScript" />
    <img src="https://img.shields.io/badge/Storage-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  </p>
</div>

---

## About Gastador

Gastador helps you make your allowance last. Set your budget, record everyday expenses, review your spending, and keep track of your remaining balance.

**Designed around three ideas:**
- **Know your balance** — see how much allowance remains.
- **Track your spending** — keep your expenses organized.
- **Understand your habits** — use activity history and insights to make informed decisions.

> **Local-first:** Your Gastador data is stored on your device. Each installation has its own data.

## Features

| Feature | What it does |
|:--|:--|
| Allowance tracking | Manage weekly, biweekly, monthly, or custom allowance cycles. |
| Expense tracking | Record and organize everyday expenses. |
| Spending insights | Review spending summaries and category breakdowns. |
| QR scanning | Scan supported payment QR codes or select a QR image. |
| Customization | Manage expense categories, payment methods, and display preferences. |
| On-device storage | Keep app data locally with SQLite. |

## Tech stack

| Layer | Technology |
|:--|:--|
| Mobile framework | Expo + React Native |
| Language | TypeScript |
| Navigation | Expo Router |
| Local database | Expo SQLite |
| Currency | Philippine peso (PHP) |

## Get started

### Requirements

- [Node.js](https://nodejs.org/) and npm
- [Expo Go](https://expo.dev/client) for compatible development previews, or an Android development build

### Run the project

Open a terminal in the repository and run:

```bash
cd mobile
npm install
npx expo start
```

Follow the Expo CLI instructions to open the app on your device or emulator.

## Build an Android APK

Gastador includes EAS build profiles for generating an installable APK.

```bash
cd mobile
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

When the cloud build finishes, download the APK from the [Expo EAS dashboard](https://expo.dev/). The installed APK runs independently and does not need Expo Go or a development server.

## Project structure

```
gastador/
└── mobile/
    ├── assets/          App icons, images, and visual assets
    ├── src/
    │   ├── app/         Screens and routes
    │   ├── components/  Reusable interface components
    │   ├── constants/   App constants and feature settings
    │   ├── data/        SQLite database and repositories
    │   ├── domain/      Allowance, expense, and app logic
    │   ├── hooks/
    │   └── types/
    ├── app.json         Expo app configuration
    ├── eas.json         Android build profiles
    └── package.json     Dependencies and scripts
```

## Data and backups

Gastador stores information locally on each device. Data is not automatically shared between installations. Back up your data before uninstalling the app, clearing its storage, or moving to another device.

---

<div align="center">
  <sub>Made for smarter everyday money habits.</sub>
</div>
