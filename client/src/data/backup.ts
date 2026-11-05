import { z } from 'zod';
import { cyclesOverlap } from '../domain/allowance';
import { normalizeName } from '../domain/categories';
import { isValidDate } from '../domain/dates';
import { MAX_CENTAVOS } from '../domain/money';
import { defaultSettings, type AppSettings, type Category, type Cycle, type CycleCategoryLimit, type SavingsContribution, type SavingsGoal, type Transaction } from '../domain/types';
import { DATA_STORES, getAll, runTx, type StoreName } from './db';
import { notifyChange } from './events';
import { ensureReady, getSettings, listReceiptRecords, type ReceiptRecord } from './repo';

export const BACKUP_FORMAT_VERSION = 1;
export const APP_VERSION = '2.0.0';

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

const money = z.number().int().min(0).max(MAX_CENTAVOS);
const date = z.string().refine(isValidDate, 'must be a valid YYYY-MM-DD date');
const iso = z.string().refine((v) => Number.isFinite(Date.parse(v)), 'must be an ISO date-time');
const id = z.string().min(1).max(100);

const categorySchema = z.object({ id, name: z.string().min(1).max(50), sortOrder: z.number().int(), archivedAt: iso.nullable(), createdAt: iso });
const cycleSchema = z.object({
  id,
  name: z.string().min(1).max(80),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'custom']),
  startDate: date,
  endDate: date,
  allowanceCentavos: money,
  carryoverCentavos: money,
  plannedSavingsCentavos: money,
  createdAt: iso
});
const limitSchema = z.object({ cycleId: id, categoryId: id, limitCentavos: money });
const transactionSchema = z.object({
  id,
  amountCentavos: money.refine((v) => v > 0, 'must be above zero'),
  occurredAt: iso,
  date,
  merchant: z.string().min(1).max(120),
  categoryId: id,
  paymentMethod: z.enum(['gcash', 'maya', 'cash', 'bank_transfer', 'other']),
  description: z.string().max(500).nullable(),
  source: z.enum(['manual', 'screenshot', 'receipt']),
  ocrStatus: z.enum(['not_applicable', 'succeeded', 'corrected', 'failed']),
  externalReference: z.string().max(120).nullable(),
  isSplurge: z.boolean(),
  receiptHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)),
  createdAt: iso,
  updatedAt: iso
});
const goalSchema = z.object({ id, name: z.string().min(1).max(80), targetCentavos: money.refine((v) => v > 0), targetDate: date.nullable(), createdAt: iso });
const contributionSchema = z.object({ id, goalId: id, amountCentavos: money.refine((v) => v > 0), contributedAt: iso });
const alertsSchema = z
  .object({
    dailyReminder: z.boolean(),
    dailyReminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    budget50: z.boolean(),
    budget75: z.boolean(),
    budget90: z.boolean(),
    budget100: z.boolean(),
    categoryOverspend: z.boolean(),
    cycleEndingSoon: z.boolean(),
    cycleEndingDays: z.number().int().min(1).max(14),
    savingsProgress: z.boolean()
  })
  .partial();
const settingsSchema = z.object({
  displayName: z.string().max(80).optional(),
  currency: z.enum(['PHP', 'USD', 'EUR', 'SGD']).optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  budgetMethod: z.enum(['daily_pace', 'category_limits', 'simple_total']).optional(),
  onboardingCompleted: z.boolean().optional(),
  alerts: alertsSchema.optional(),
  createdAt: iso.optional()
});

const dataSchema = z.object({
  settings: settingsSchema,
  categories: z.array(categorySchema),
  cycles: z.array(cycleSchema),
  cycleLimits: z.array(limitSchema),
  transactions: z.array(transactionSchema),
  goals: z.array(goalSchema),
  contributions: z.array(contributionSchema)
});

const receiptFileSchema = z.object({
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  base64: z.string()
});

const backupSchema = z.object({
  app: z.literal('gastador'),
  formatVersion: z.number().int().min(1),
  exportedAt: iso,
  appVersion: z.string().optional(),
  data: dataSchema,
  receipts: z.array(receiptFileSchema).optional()
});

export type BackupData = z.infer<typeof dataSchema>;
export type BackupFile = z.infer<typeof backupSchema>;
export type RestoreMode = 'replace' | 'merge';

export interface RestoreReport {
  mode: RestoreMode;
  categories: number;
  cycles: number;
  transactions: number;
  goals: number;
  contributions: number;
  receipts: number;
  skipped: string[];
}

function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function snapshotData(): Promise<BackupData> {
  await ensureReady();
  const [settings, categories, cycles, limits, transactions, goals, contributions] = await Promise.all([
    getSettings(),
    getAll<Category>('categories'),
    getAll<Cycle>('cycles'),
    getAll<CycleCategoryLimit>('cycleLimits'),
    getAll<Transaction>('transactions'),
    getAll<SavingsGoal>('goals'),
    getAll<SavingsContribution>('contributions')
  ]);
  return {
    settings,
    categories,
    cycles,
    cycleLimits: limits.map(({ cycleId, categoryId, limitCentavos }) => ({ cycleId, categoryId, limitCentavos })),
    transactions,
    goals,
    contributions
  };
}

export async function createBackup(options: { includeReceipts: boolean }): Promise<BackupFile> {
  const data = await snapshotData();
  const file: BackupFile = { app: 'gastador', formatVersion: BACKUP_FORMAT_VERSION, exportedAt: new Date().toISOString(), appVersion: APP_VERSION, data };
  if (options.includeReceipts) {
    const referenced = new Set(data.transactions.flatMap((t) => t.receiptHashes));
    const records = (await listReceiptRecords()).filter((r) => referenced.has(r.hash));
    file.receipts = records
      .filter((r): r is ReceiptRecord & { mime: 'image/jpeg' | 'image/png' | 'image/webp' } => ['image/jpeg', 'image/png', 'image/webp'].includes(r.mime))
      .map((r) => ({ hash: r.hash, mime: r.mime, base64: bytesToBase64(r.buffer) }));
  }
  return file;
}

export function backupFilename(now = new Date()): string {
  return `gastador-backup-${now.toISOString().slice(0, 10)}.json`;
}

export function parseBackup(input: string | unknown): BackupFile {
  let raw: unknown = input;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input.replace(/^\uFEFF/, ''));
    } catch {
      throw new BackupError('That file is not valid JSON, so it cannot be a Gastador backup.');
    }
  }
  if (typeof raw !== 'object' || raw === null || (raw as { app?: unknown }).app !== 'gastador') {
    throw new BackupError('That file is not a Gastador backup.');
  }
  const version = (raw as { formatVersion?: unknown }).formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) throw new BackupError('This backup is missing its format version.');
  if (version > BACKUP_FORMAT_VERSION) {
    throw new BackupError('This backup was made by a newer version of Gastador. Update the app, then try again.');
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new BackupError(`This backup is damaged or incomplete (${issue.path.join('.') || 'file'}: ${issue.message}). Nothing was changed.`);
  }
  checkIntegrity(parsed.data.data);
  return parsed.data;
}

export function checkIntegrity(data: BackupData): void {
  const categoryIds = new Set(data.categories.map((c) => c.id));
  const cycleIds = new Set(data.cycles.map((c) => c.id));
  const goalIds = new Set(data.goals.map((g) => g.id));
  if (categoryIds.size !== data.categories.length) throw new BackupError('This backup repeats a category. Nothing was changed.');
  if (new Set(data.transactions.map((t) => t.id)).size !== data.transactions.length) throw new BackupError('This backup repeats an expense. Nothing was changed.');
  if (data.transactions.some((t) => !categoryIds.has(t.categoryId))) throw new BackupError('Some expenses point to a category that is not in the backup. Nothing was changed.');
  if (data.cycleLimits.some((l) => !cycleIds.has(l.cycleId) || !categoryIds.has(l.categoryId))) throw new BackupError('Some category limits point to missing data. Nothing was changed.');
  if (data.contributions.some((c) => !goalIds.has(c.goalId))) throw new BackupError('Some savings entries point to a missing goal. Nothing was changed.');
  for (const c of data.cycles) if (c.endDate < c.startDate) throw new BackupError(`The cycle “${c.name}” ends before it starts. Nothing was changed.`);
  const sorted = [...data.cycles].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  for (let i = 1; i < sorted.length; i++) {
    if (cyclesOverlap(sorted[i - 1], sorted[i])) throw new BackupError(`The cycles “${sorted[i - 1].name}” and “${sorted[i].name}” overlap. Nothing was changed.`);
  }
}

function mergeSettings(base: AppSettings, incoming: BackupData['settings']): AppSettings {
  return { ...base, ...incoming, alerts: { ...base.alerts, ...(incoming.alerts ?? {}) } } as AppSettings;
}

export async function applyData(data: BackupData, receipts: ReceiptRecord[], mode: RestoreMode): Promise<RestoreReport> {
  await ensureReady();
  const report: RestoreReport = { mode, categories: 0, cycles: 0, transactions: 0, goals: 0, contributions: 0, receipts: 0, skipped: [] };
  const stores: StoreName[] = [...DATA_STORES, 'receipts', 'settings'];

  if (mode === 'replace') {
    const settings = mergeSettings(defaultSettings(), data.settings);
    await runTx(stores, 'readwrite', (tx) => {
      for (const s of [...DATA_STORES, 'receipts' as StoreName]) tx.objectStore(s).clear();
      data.categories.forEach((r) => tx.objectStore('categories').put(r));
      data.cycles.forEach((r) => tx.objectStore('cycles').put(r));
      data.cycleLimits.forEach((r) => tx.objectStore('cycleLimits').put({ ...r, key: `${r.cycleId}:${r.categoryId}` }));
      data.transactions.forEach((r) => tx.objectStore('transactions').put(r));
      data.goals.forEach((r) => tx.objectStore('goals').put(r));
      data.contributions.forEach((r) => tx.objectStore('contributions').put(r));
      receipts.forEach((r) => tx.objectStore('receipts').put(r));
      tx.objectStore('settings').put({ key: 'app', value: settings });
    });
    Object.assign(report, {
      categories: data.categories.length,
      cycles: data.cycles.length,
      transactions: data.transactions.length,
      goals: data.goals.length,
      contributions: data.contributions.length,
      receipts: receipts.length
    });
    notifyChange();
    return report;
  }

  const [existingCategories, existingCycles, existingTx, existingGoals, existingContribs, existingReceipts, currentSettings] = await Promise.all([
    getAll<Category>('categories'),
    getAll<Cycle>('cycles'),
    getAll<Transaction>('transactions'),
    getAll<SavingsGoal>('goals'),
    getAll<SavingsContribution>('contributions'),
    getAll<ReceiptRecord>('receipts'),
    getSettings()
  ]);
  const categoryMap = new Map<string, string>();
  const newCategories: Category[] = [];
  let order = existingCategories.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;
  for (const c of data.categories) {
    const sameId = existingCategories.find((e) => e.id === c.id);
    const sameName = existingCategories.find((e) => normalizeName(e.name) === normalizeName(c.name));
    if (sameId) categoryMap.set(c.id, sameId.id);
    else if (sameName) categoryMap.set(c.id, sameName.id);
    else {
      newCategories.push({ ...c, sortOrder: order++ });
      categoryMap.set(c.id, c.id);
    }
  }
  const knownCycles = [...existingCycles];
  const newCycles: Cycle[] = [];
  const cycleIds = new Set(existingCycles.map((c) => c.id));
  const acceptedCycleIds = new Set<string>();
  for (const c of data.cycles) {
    if (cycleIds.has(c.id)) {
      report.skipped.push(`Cycle “${c.name}” is already on this device.`);
      continue;
    }
    const clash = knownCycles.find((k) => cyclesOverlap(k, c));
    if (clash) {
      report.skipped.push(`Cycle “${c.name}” overlaps “${clash.name}” and was not added.`);
      continue;
    }
    knownCycles.push(c);
    newCycles.push(c);
    acceptedCycleIds.add(c.id);
  }
  const txIds = new Set(existingTx.map((t) => t.id));
  const newTx = data.transactions.filter((t) => !txIds.has(t.id)).map((t) => ({ ...t, categoryId: categoryMap.get(t.categoryId) ?? t.categoryId }));
  const skippedTx = data.transactions.length - newTx.length;
  if (skippedTx) report.skipped.push(`${skippedTx} expense${skippedTx === 1 ? ' was' : 's were'} already on this device.`);
  const goalIds = new Set(existingGoals.map((g) => g.id));
  const newGoals = data.goals.filter((g) => !goalIds.has(g.id));
  const contribIds = new Set(existingContribs.map((c) => c.id));
  const knownGoalIds = new Set([...goalIds, ...newGoals.map((g) => g.id)]);
  const newContribs = data.contributions.filter((c) => !contribIds.has(c.id) && knownGoalIds.has(c.goalId));
  const have = new Set(existingReceipts.map((r) => r.hash));
  const newReceipts = receipts.filter((r) => !have.has(r.hash));
  const newLimits = data.cycleLimits.filter((l) => acceptedCycleIds.has(l.cycleId)).map((l) => ({ ...l, categoryId: categoryMap.get(l.categoryId) ?? l.categoryId }));
  const settings = currentSettings.onboardingCompleted ? currentSettings : mergeSettings(currentSettings, data.settings);

  await runTx(stores, 'readwrite', (tx) => {
    newCategories.forEach((r) => tx.objectStore('categories').put(r));
    newCycles.forEach((r) => tx.objectStore('cycles').put(r));
    newLimits.forEach((r) => tx.objectStore('cycleLimits').put({ ...r, key: `${r.cycleId}:${r.categoryId}` }));
    newTx.forEach((r) => tx.objectStore('transactions').put(r));
    newGoals.forEach((r) => tx.objectStore('goals').put(r));
    newContribs.forEach((r) => tx.objectStore('contributions').put(r));
    newReceipts.forEach((r) => tx.objectStore('receipts').put(r));
    tx.objectStore('settings').put({ key: 'app', value: settings });
  });
  Object.assign(report, {
    categories: newCategories.length,
    cycles: newCycles.length,
    transactions: newTx.length,
    goals: newGoals.length,
    contributions: newContribs.length,
    receipts: newReceipts.length
  });
  notifyChange();
  return report;
}

export function receiptsFromBackup(file: BackupFile): ReceiptRecord[] {
  return (file.receipts ?? []).map((r) => {
    const buffer = base64ToBuffer(r.base64);
    return { hash: r.hash, mime: r.mime, size: buffer.byteLength, buffer, createdAt: file.exportedAt };
  });
}

export async function restoreBackup(file: BackupFile, mode: RestoreMode): Promise<RestoreReport> {
  return applyData(file.data, receiptsFromBackup(file), mode);
}

export function summarizeBackup(file: BackupFile) {
  return {
    exportedAt: file.exportedAt,
    transactions: file.data.transactions.length,
    cycles: file.data.cycles.length,
    categories: file.data.categories.length,
    goals: file.data.goals.length,
    receipts: file.receipts?.length ?? 0
  };
}
