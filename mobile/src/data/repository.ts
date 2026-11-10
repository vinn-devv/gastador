import type { SQLiteDatabase } from "expo-sqlite";

import type {
  AppSettings,
  Category,
  Cycle,
  Transaction,
} from "../domain/types";
import { defaultSettings } from "../domain/types";
import { addDays, fromManilaInput, isValidDate, manilaHourMinute, manilaToday } from "../domain/dates";
import { cycleContainsDate, rangesOverlapInclusive } from "../domain/cycle-dates";

type SettingsRow = {
  displayName: string;
  currency: AppSettings["currency"];
  theme: AppSettings["theme"];
  budgetMethod: AppSettings["budgetMethod"];
  onboardingCompleted: number;
  hasOnboarded: number;
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
    hasOnboarded: Boolean(row.hasOnboarded || row.onboardingCompleted),
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
      hasOnboarded = ?,
      alertsJson = ?
     WHERE id = 1`,
    settings.displayName,
    settings.currency,
    settings.theme,
    settings.budgetMethod,
    Number(settings.onboardingCompleted),
    Number(settings.hasOnboarded),
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
  if (!isValidDate(input.date) || input.date > manilaToday()) {
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



export class CycleOverlapError extends Error {
  readonly code = "CYCLE_OVERLAP";
  constructor(message = "You already have an allowance for these dates. Update it or start the next cycle.") {
    super(message);
    this.name = "CycleOverlapError";
  }
}

export type SaveAllowanceInput = {
  amountCentavos: number;
  startDate: string;
  period?: Cycle["frequency"];
  lengthDays?: number;
  mode?: "edit_current" | "start_next";
  name?: string;
  plannedSavingsCentavos?: number;
};

function allowanceLength(input: SaveAllowanceInput): number {
  if (input.lengthDays !== undefined) return input.lengthDays;
  if (input.period === "weekly") return 7;
  if (input.period === "biweekly") return 14;
  if (input.period === "monthly") {
    const [year, month] = input.startDate.split("-").map(Number);
    return Math.round((Date.UTC(year, month, 1) - Date.UTC(year, month - 1, Number(input.startDate.slice(8, 10)))) / 86_400_000);
  }
  throw new RangeError("Choose a valid allowance length.");
}

export async function saveAllowance(db: SQLiteDatabase, input: SaveAllowanceInput): Promise<void> {
  if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0) {
    throw new RangeError("Allowance must be greater than zero.");
  }
  if (!isValidDate(input.startDate)) throw new RangeError("Choose a valid allowance start date.");
  const lengthDays = allowanceLength(input);
  if (!Number.isSafeInteger(lengthDays) || lengthDays < 1 || lengthDays > 366) {
    throw new RangeError("Choose a valid allowance length.");
  }
  const savings = input.plannedSavingsCentavos ?? 0;
  if (!Number.isSafeInteger(savings) || savings < 0 || savings > input.amountCentavos) {
    throw new RangeError("Planned savings must be between zero and the allowance amount.");
  }
  const today = manilaToday();
  const requestedMode = input.mode ?? "edit_current";
  await db.withTransactionAsync(async () => {
    const cycles = await db.getAllAsync<Pick<Cycle, "id" | "name" | "frequency" | "startDate" | "endDate" | "allowanceCentavos" | "carryoverCentavos" | "plannedSavingsCentavos" | "createdAt">>("SELECT * FROM cycles ORDER BY startDate ASC");
    const current = cycles.find((cycle) => cycleContainsDate(cycle, today));
    const now = new Date().toISOString();
    if (current && requestedMode === "edit_current") {
      const endDate = addDays(current.startDate, lengthDays - 1);
      const conflict = cycles.find((cycle) => cycle.id !== current.id &&
        rangesOverlapInclusive({ startDate: current.startDate, endDate }, cycle));
      if (conflict) throw new CycleOverlapError();
      await db.runAsync(
        "UPDATE cycles SET name = ?, frequency = ?, endDate = ?, allowanceCentavos = ?, plannedSavingsCentavos = ? WHERE id = ?",
        input.name?.trim() || current.name,
        input.period ?? current.frequency,
        endDate,
        input.amountCentavos,
        savings,
        current.id,
      );
      return;
    }
    let startDate = input.startDate;
    if (current && requestedMode === "start_next") {
      if (startDate <= current.startDate) throw new CycleOverlapError();
      const previousEnd = addDays(startDate, -1);
      await db.runAsync("UPDATE cycles SET endDate = ? WHERE id = ?", previousEnd, current.id);
    }
    const endDate = addDays(startDate, lengthDays - 1);
    const conflict = cycles.find((cycle) => {
      if (current && requestedMode === "start_next" && cycle.id === current.id) return false;
      return rangesOverlapInclusive({ startDate, endDate }, cycle);
    });
    if (conflict) throw new CycleOverlapError();
    const id = `cycle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await db.runAsync(
      `INSERT INTO cycles (
        id, name, frequency, startDate, endDate, allowanceCentavos,
        carryoverCentavos, plannedSavingsCentavos, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      id,
      input.name?.trim() || `Allowance from ${startDate}`,
      input.period ?? "custom",
      startDate,
      endDate,
      input.amountCentavos,
      savings,
      now,
    );
  });
}

export type NewCycleInput = {
  name: string;
  frequency: Cycle["frequency"];
  startDate: string;
  endDate: string;
  allowanceCentavos: number;
  plannedSavingsCentavos?: number;
};

export async function createCycle(
  db: SQLiteDatabase,
  input: NewCycleInput,
): Promise<void> {
  if (!Number.isSafeInteger(input.allowanceCentavos) || input.allowanceCentavos <= 0) {
    throw new RangeError("Allowance must be greater than zero.");
  }
  if (!isValidDate(input.startDate) || !isValidDate(input.endDate) || input.endDate < input.startDate) {
    throw new RangeError("Choose a valid allowance date range.");
  }
  const savings = input.plannedSavingsCentavos ?? 0;
  if (!Number.isSafeInteger(savings) || savings < 0 || savings > input.allowanceCentavos) {
    throw new RangeError("Planned savings must be between zero and the allowance amount.");
  }

  const existing = await db.getAllAsync<Pick<Cycle, "id" | "startDate" | "endDate">>(
    "SELECT id, startDate, endDate FROM cycles",
  );
  const overlap = existing.find((cycle) => rangesOverlapInclusive(input, cycle));
  if (overlap) throw new CycleOverlapError();

  const now = new Date().toISOString();
  const id = `cycle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const defaultName = `Allowance from ${input.startDate}`;

  await db.runAsync(
    `INSERT INTO cycles (
      id, name, frequency, startDate, endDate, allowanceCentavos,
      carryoverCentavos, plannedSavingsCentavos, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id,
    input.name.trim() || defaultName,
    input.frequency,
    input.startDate,
    input.endDate,
    input.allowanceCentavos,
    savings,
    now,
  );
}
