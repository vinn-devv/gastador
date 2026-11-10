/**
 * Optional features stay hidden until their complete workflows are implemented.
 */
export const FEATURES = {
  // TODO: Implement in mobile/src/data/backup.ts
  backup: false,
  // TODO: Implement in mobile/src/data/backup.ts
  restore: false,
  // TODO: Implement in mobile/src/domain/csv.ts
  exportCsv: false,
  // TODO: Implement in mobile/src/domain/csv.ts
  importCsv: false,
  // TODO: Implement in mobile/src/app/goals.tsx and mobile/src/data/repository.ts
  goals: false,
  // TODO: Implement in mobile/src/app/category-limits.tsx and mobile/src/data/repository.ts
  limits: false,
  // TODO: Implement in mobile/src/app/notifications.tsx
  notifications: false,
  // TODO: Implement in mobile/src/hooks/use-app-lock.ts
  appLock: false,
  // TODO: Implement in mobile/src/domain/receipt-ocr.ts
  ocr: false,
  // TODO: Implement in mobile/src/data/purchases.ts
  purchase: false,
} as const;
