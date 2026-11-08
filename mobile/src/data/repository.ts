import type { SQLiteDatabase } from "expo-sqlite";

import type {
  AppSettings,
  Category,
  Cycle,
  Transaction,
} from "../domain/types";
import { defaultSettings } from "../domain/types";
import { fromManilaInput, manilaHourMinute } from "../domain/dates";

type SettingsRow = {
  displayName: string;
  currency: AppSettings["currency"];
  theme: AppSettings["theme"];
  budgetMethod: AppSettings["budgetMethod"];
  onboardingCompleted: number;
  alertsJson: string;
  createdAt: string;
};

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const defaults = defaultSettings(new Date());

  const row = await db.getFirstAsync<SettingsRow>(
    "SELECT * FROM settings WHERE id = 1",
  );

  if (!row) return defaults;

  return {
    ...defaults,
    displayName: row.displayName,
    currency: row.currency,
    theme: row.theme,
    budgetMethod: row.budgetMethod,
    onboardingCompleted: Boolean(row.onboardingCompleted),
    alerts: {
      ...defaults.alerts,
      ...JSON.parse(row.alertsJson),
    },
    createdAt: row.createdAt,
  };
}

export async function getCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>(
    `SELECT id, name, sortOrder, archivedAt, createdAt
     FROM categories
     WHERE archivedAt IS NULL
     ORDER BY sortOrder ASC, name ASC`,
  );
}

export async function saveSettings(
  db: SQLiteDatabase,
  settings: AppSettings,
): Promise<void> {
  await db.runAsync(
    `UPDATE settings SET
      displayName = ?,
      currency = ?,
      theme = ?,
      budgetMethod = ?,
      onboardingCompleted = ?,
      alertsJson = ?
     WHERE id = 1`,
    settings.displayName,
    settings.currency,
    settings.theme,
    settings.budgetMethod,
    Number(settings.onboardingCompleted),
    JSON.stringify(settings.alerts),
  );
}

export type RecentTransaction = Transaction & {
  categoryName: string;
};

type TransactionRow = Omit<Transaction, "isSplurge" | "receiptHashes"> & {
  isSplurge: number;
  receiptHashesJson: string;
  categoryName: string;
};

export async function getRecentTransactions(
  db: SQLiteDatabase,
): Promise<RecentTransaction[]> {
  const rows = await db.getAllAsync<TransactionRow>(
    `SELECT
      t.*,
      c.name AS categoryName
    FROM transactions t
    JOIN categories c ON c.id = t.categoryId
    ORDER BY t.occurredAt DESC
    LIMIT 5`,
  );

  return rows.map(({ receiptHashesJson, ...row }) => ({
    ...row,
    isSplurge: Boolean(row.isSplurge),
    receiptHashes: JSON.parse(receiptHashesJson),
  }));
}

export async function getCycles(db: SQLiteDatabase): Promise<Cycle[]> {
  return db.getAllAsync<Cycle>(
    `SELECT
      id,
      name,
      frequency,
      startDate,
      endDate,
      allowanceCentavos,
      carryoverCentavos,
      plannedSavingsCentavos,
      createdAt
    FROM cycles
    ORDER BY startDate DESC`,
  );
}

export async function getAllTransactions(
  db: SQLiteDatabase,
): Promise<Transaction[]> {
  const rows = await db.getAllAsync<TransactionRow>(
    `SELECT
      t.*,
      c.name AS categoryName
    FROM transactions t
    JOIN categories c ON c.id = t.categoryId
    ORDER BY t.occurredAt DESC`,
  );

  return rows.map(({ receiptHashesJson, categoryName, ...row }) => ({
    ...row,
    isSplurge: Boolean(row.isSplurge),
    receiptHashes: JSON.parse(receiptHashesJson),
  }));
}


export type NewTransactionInput = {
  amountCentavos: number;
  date: string;
  merchant: string;
  categoryId: string;
  paymentMethod: Transaction["paymentMethod"];
  description?: string | null;
};

export async function createTransaction(
  db: SQLiteDatabase,
  input: NewTransactionInput,
): Promise<void> {
  if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0) {
    throw new RangeError("Expense amount must be greater than zero.");
  }
  if (!input.categoryId.trim()) {
    throw new Error("Choose a category before saving.");
  }
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(input.date)) {
    throw new Error("Choose a valid expense date.");
  }

  const now = new Date().toISOString();
  const occurredAt = fromManilaInput(`${input.date}T${manilaHourMinute()}`) ?? now;
  const id = `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  await db.runAsync(
    `INSERT INTO transactions (
      id, amountCentavos, occurredAt, date, merchant, categoryId,
      paymentMethod, description, source, ocrStatus, externalReference,
      isSplurge, receiptHashesJson, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', 'not_applicable', NULL, 0, '[]', ?, ?)`,
    id,
    input.amountCentavos,
    occurredAt,
    input.date,
    input.merchant.trim() || "Expense",
    input.categoryId,
    input.paymentMethod,
    input.description?.trim() || null,
    now,
    now,
  );
}
