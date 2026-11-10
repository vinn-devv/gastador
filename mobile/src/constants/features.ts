/**
 * Feature gates describe complete workflows only. Preferences that are persisted
 * in AppSettings are not treated as proof that their dependent native workflows
 * (notifications, app lock, backups, purchases) are implemented.
 */
export const FEATURES = {
  // Settings preferences can be stored locally; related workflows remain gated.
  settingsPreferences: true,
  categoryManagement: true,
  paymentMethodManagement: true,
  // TODO: Implement encrypted backup and restore in mobile/src/data/backup.ts
  backup: false,
  restore: false,
  // TODO: Implement CSV import/export in mobile/src/domain/csv.ts
  exportCsv: false,
  importCsv: false,
  // TODO: Implement in mobile/src/app/goals.tsx and mobile/src/data/repository.ts
  goals: false,
  // TODO: Implement in mobile/src/app/category-limits.tsx and mobile/src/data/repository.ts
  limits: false,
  // Preference toggles exist, but native scheduling and permission flows are not complete.
  notifications: false,
  // TODO: Implement with expo-local-authentication and secure credential storage.
  appLock: false,
  // TODO: Implement in mobile/src/domain/receipt-ocr.ts
  ocr: false,
  // TODO: Implement in mobile/src/data/purchases.ts
  purchase: false,
} as const;
