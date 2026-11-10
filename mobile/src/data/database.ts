import type { SQLiteDatabase } from "expo-sqlite";
import { STANDARD_CATEGORIES } from "../domain/categories";
import { defaultSettings } from "../domain/types";

export const DB_NAME = "gastador.db";
export const DB_VERSION = 2;

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      displayName TEXT NOT NULL DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'PHP',
      theme TEXT NOT NULL DEFAULT 'system',
      budgetMethod TEXT NOT NULL DEFAULT 'daily_pace',
      onboardingCompleted INTEGER NOT NULL DEFAULT 0,
      hasOnboarded INTEGER NOT NULL DEFAULT 0,
      alertsJson TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      archivedAt TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cycles (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      frequency TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      allowanceCentavos INTEGER NOT NULL CHECK (allowanceCentavos >= 0),
      carryoverCentavos INTEGER NOT NULL DEFAULT 0,
      plannedSavingsCentavos INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cycleLimits (
      cycleId TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      limitCentavos INTEGER NOT NULL CHECK (limitCentavos >= 0),
      PRIMARY KEY (cycleId, categoryId),
      FOREIGN KEY (cycleId) REFERENCES cycles(id) ON DELETE CASCADE,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      amountCentavos INTEGER NOT NULL CHECK (amountCentavos > 0),
      occurredAt TEXT NOT NULL,
      date TEXT NOT NULL,
      merchant TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      paymentMethod TEXT NOT NULL,
      description TEXT,
      source TEXT NOT NULL,
      ocrStatus TEXT NOT NULL,
      externalReference TEXT,
      isSplurge INTEGER NOT NULL DEFAULT 0,
      receiptHashesJson TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date
      ON transactions(date);

    CREATE INDEX IF NOT EXISTS idx_transactions_category
      ON transactions(categoryId);

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      targetCentavos INTEGER NOT NULL CHECK (targetCentavos > 0),
      targetDate TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY NOT NULL,
      goalId TEXT NOT NULL,
      amountCentavos INTEGER NOT NULL CHECK (amountCentavos > 0),
      contributedAt TEXT NOT NULL,
      FOREIGN KEY (goalId) REFERENCES goals(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contributions_goal
      ON contributions(goalId);

    CREATE TABLE IF NOT EXISTS receipts (
      hash TEXT PRIMARY KEY NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      data BLOB NOT NULL,
      createdAt TEXT NOT NULL
    );


  `);
  const settingColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(settings)");
  if (!settingColumns.some((column) => column.name === "hasOnboarded")) {
    await db.execAsync("ALTER TABLE settings ADD COLUMN hasOnboarded INTEGER NOT NULL DEFAULT 0");
    await db.execAsync("UPDATE settings SET hasOnboarded = onboardingCompleted");
  }
  await db.execAsync("PRAGMA user_version = 2");

  // Seed default settings only when the app has no settings yet.
  const now = new Date().toISOString();
  const settings = defaultSettings(new Date(now));

  await db.runAsync(
    `INSERT OR IGNORE INTO settings (
      id,
      displayName,
      currency,
      theme,
      budgetMethod,
      onboardingCompleted,
      hasOnboarded,
      alertsJson,
      createdAt
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    settings.displayName,
    settings.currency,
    settings.theme,
    settings.budgetMethod,
    Number(settings.onboardingCompleted),
    Number(settings.hasOnboarded),
    JSON.stringify(settings.alerts),
    settings.createdAt,
  );

  // Seed standard categories without duplicating them.
  for (const [index, category] of STANDARD_CATEGORIES.entries()) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (
        id,
        name,
        sortOrder,
        archivedAt,
        createdAt
      ) VALUES (?, ?, ?, NULL, ?)`,
      `standard-${category.key}`,
      category.name,
      index,
      now,
    );
  }
}
