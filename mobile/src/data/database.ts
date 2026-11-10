import type { SQLiteDatabase } from "expo-sqlite";
import { STANDARD_CATEGORIES } from "../domain/categories";
import { defaultSettings } from "../domain/types";
import { convertLegacyCycleDate, rangesOverlapInclusive } from "../domain/cycle-dates";

export const DB_NAME = "gastador.db";
export const DB_VERSION = 3;

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
    await db.execAsync("UPDATE settings SET hasOnboarded = 1");
  }
  if (!settingColumns.some((column) => column.name === "cycleDateMigrationVersion")) {\n    await db.execAsync("ALTER TABLE settings ADD COLUMN cycleDateMigrationVersion INTEGER NOT NULL DEFAULT 0");\n  }\n  if (!settingColumns.some((column) => column.name === "cycleReviewNoticePending")) {\n    await db.execAsync("ALTER TABLE settings ADD COLUMN cycleReviewNoticePending INTEGER NOT NULL DEFAULT 0");\n  }\n  const cycleColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(cycles)");\n  if (!cycleColumns.some((column) => column.name === "needsReview")) {\n    await db.execAsync("ALTER TABLE cycles ADD COLUMN needsReview INTEGER NOT NULL DEFAULT 0");\n  }

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


  // One-time cycle date normalization. All row backups, conversions, conflict flags,
  // and both schema-version markers are committed atomically.
  const migrationState = await db.getFirstAsync<{ cycleDateMigrationVersion: number }>(
    "SELECT cycleDateMigrationVersion FROM settings WHERE id = 1",
  );
  if ((migrationState?.cycleDateMigrationVersion ?? 0) < 1) {
    let failedCycleId: string | null = null;
    try {
      await db.withTransactionAsync(async () => {
        const rows = await db.getAllAsync<{ id: string; startDate: string; endDate: string }>(
          "SELECT id, startDate, endDate FROM cycles ORDER BY id",
        );
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS cycle_date_backup (
            cycle_id TEXT PRIMARY KEY NOT NULL,
            old_start TEXT NOT NULL,
            old_end TEXT NOT NULL,
            migrated_at TEXT NOT NULL
          );
        `);
        const migratedAt = new Date().toISOString();
        let converted = 0;
        let skipped = 0;
        for (const row of rows) {
          failedCycleId = row.id;
          await db.runAsync(
            "INSERT OR IGNORE INTO cycle_date_backup (cycle_id, old_start, old_end, migrated_at) VALUES (?, ?, ?, ?)",
            row.id, row.startDate, row.endDate, migratedAt,
          );
          const start = convertLegacyCycleDate(row.startDate);
          const end = convertLegacyCycleDate(row.endDate);
          if (!start.ok || !end.ok) {
            throw new Error(`Unable to normalize cycle dates for cycle ${row.id}`);
          }
          if (start.changed || end.changed) {
            await db.runAsync(
              "UPDATE cycles SET startDate = ?, endDate = ? WHERE id = ?",
              start.date, end.date, row.id,
            );
            converted += 1;
          } else {
            skipped += 1;
          }
        }
        const normalized = await db.getAllAsync<{ id: string; startDate: string; endDate: string }>(
          "SELECT id, startDate, endDate FROM cycles ORDER BY startDate, id",
        );
        await db.runAsync("UPDATE cycles SET needsReview = 0");
        const conflicts: Array<[string, string]> = [];
        for (let i = 0; i < normalized.length; i += 1) {
          for (let j = i + 1; j < normalized.length; j += 1) {
            if (rangesOverlapInclusive(normalized[i], normalized[j])) {
              conflicts.push([normalized[i].id, normalized[j].id]);
              await db.runAsync("UPDATE cycles SET needsReview = 1 WHERE id IN (?, ?)", normalized[i].id, normalized[j].id);
              console.warn("[cycle-date-migration] overlap conflict", normalized[i].id, normalized[j].id);
            }
          }
        }
        await db.runAsync(
          "UPDATE settings SET cycleDateMigrationVersion = 1, cycleReviewNoticePending = ? WHERE id = 1",
          Number(conflicts.length > 0),
        );
        await db.execAsync("PRAGMA user_version = 3");
        console.info("[cycle-date-migration] complete", {
          scanned: rows.length, converted, skipped, conflicts: conflicts.length,
        });
      });
    } catch (error) {
      console.error("[cycle-date-migration] rolled back; failed cycle:", failedCycleId, error);
      // Keep launch available; the migration version remains unchanged for a safe retry.
    }
  }

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
