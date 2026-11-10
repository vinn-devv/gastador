/**
 * Feature availability flags. Keep incomplete native/data workflows hidden
 * from entry points until their complete implementation is shipped.
 */
export const FEATURES = {
  settingsPreferences: true,
  backup: false,
  restore: false,
  exportCsv: false,
  importCsv: false,
  goals: false,
  limits: false,
  notifications: false,
  appLock: false,
  ocr: false,
  purchase: false,
  categoryManagement: false,
  paymentMethodManagement: false,
  privacyControls: false,
} as const;
