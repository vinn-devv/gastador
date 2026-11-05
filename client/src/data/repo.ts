import { carryoverFrom, findOverlap } from '../domain/allowance';
import { missingStandardCategories, normalizeName, STANDARD_CATEGORIES } from '../domain/categories';
import { addDays, isValidDate, manilaDateOf } from '../domain/dates';
import { findDuplicate, type DuplicateMatch } from '../domain/duplicates';
import { MAX_CENTAVOS } from '../domain/money';
import {
  defaultSettings,
  PAYMENT_METHODS,
  type AppSettings,
  type Category,
  type Cycle,
  type CycleCategoryLimit,
  type Frequency,
  type OcrStatus,
  type PaymentMethod,
  type SavingsContribution,
  type SavingsGoal,
  type Transaction,
  type TxSource
} from '../domain/types';
import { ValidationError } from '../domain/validation';
import { DATA_STORES, deleteOne, getAll, getOne, openDb, putOne, requestToPromise, runTx, type StoreName } from './db';
import { notifyChange } from './events';
import { newId } from './ids';

interface SettingsRecord<T> {
  key: string;
  value: T;
}

export class DuplicateError extends Error {
  match: DuplicateMatch;
  constructor(match: DuplicateMatch) {
    super(match.kind === 'reference' ? 'This payment reference is already recorded.' : 'This looks like an expense you already saved.');
    this.name = 'DuplicateError';
    this.match = match;
  }
}

export interface WorldData {
  settings: AppSettings;
  categories: Category[];
  cycles: Cycle[];
  limits: CycleCategoryLimit[];
  transactions: Transaction[];
  goals: SavingsGoal[];
  contributions: SavingsContribution[];
}

export interface ReceiptRecord {
  hash: string;
  mime: string;
  size: number;
  buffer: ArrayBuffer;
  createdAt: string;
}

let ready: Promise<void> | null = null;

export function resetReadyForTests(): void {
  ready = null;
}

export function ensureReady(): Promise<void> {
  if (!ready) {
    ready = seedIfNeeded().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function seedIfNeeded(): Promise<void> {
  await openDb();
  const existing = await getOne<SettingsRecord<AppSettings>>('settings', 'app');
  if (!existing) await putOne('settings', { key: 'app', value: defaultSettings() } satisfies SettingsRecord<AppSettings>);
  const categories = await getAll<Category>('categories');
  if (categories.length === 0 && !existing) await seedDefaultCategories();
}

export async function seedDefaultCategories(): Promise<void> {
  const now = new Date().toISOString();
  await runTx(['categories'], 'readwrite', async (tx) => {
    const store = tx.objectStore('categories');
    for (const [i, def] of STANDARD_CATEGORIES.entries()) {
      store.put({ id: newId(), name: def.name, sortOrder: i, archivedAt: null, createdAt: now } satisfies Category);
    }
  });
}

export async function loadWorld(): Promise<WorldData> {
  await ensureReady();
  const [settings, categories, cycles, limits, transactions, goals, contributions] = await Promise.all([
    getSettings(),
    getAll<Category>('categories'),
    getAll<Cycle>('cycles'),
    getAll<CycleCategoryLimit & { key: string }>('cycleLimits'),
    getAll<Transaction>('transactions'),
    getAll<SavingsGoal>('goals'),
    getAll<SavingsContribution>('contributions')
  ]);
  return {
    settings,
    categories: categories.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    cycles: cycles.sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
    limits: limits.map(({ cycleId, categoryId, limitCentavos }) => ({ cycleId, categoryId, limitCentavos })),
    transactions: transactions.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0)),
    goals: goals.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    contributions
  };
}

export async function getSettings(): Promise<AppSettings> {
  const record = await getOne<SettingsRecord<AppSettings>>('settings', 'app');
  const defaults = defaultSettings();
  const value = record?.value ?? defaults;
  return { ...defaults, ...value, alerts: { ...defaults.alerts, ...(value.alerts ?? {}) } };
}

export async function updateSettings(patch: Partial<Omit<AppSettings, 'alerts'>> & { alerts?: Partial<AppSettings['alerts']> }): Promise<AppSettings> {
  await ensureReady();
  const current = await getSettings();
  const next: AppSettings = { ...current, ...patch, alerts: { ...current.alerts, ...(patch.alerts ?? {}) } };
  if (next.displayName.length > 80) throw new ValidationError({ displayName: 'Keep your name under 80 characters.' });
  await putOne('settings', { key: 'app', value: next } satisfies SettingsRecord<AppSettings>);
  notifyChange();
  return next;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const record = await getOne<SettingsRecord<T>>('settings', key);
  return record?.value;
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  await putOne('settings', { key, value } satisfies SettingsRecord<T>);
}

export async function removeMeta(key: string): Promise<void> {
  await deleteOne('settings', key);
}

function cleanName(raw: string, max: number, field: string, label: string): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) throw new ValidationError({ [field]: `Enter ${label}.` });
  if (name.length > max) throw new ValidationError({ [field]: `Keep ${label} under ${max} characters.` });
  return name;
}

export async function addCategory(rawName: string): Promise<Category> {
  await ensureReady();
  const name = cleanName(rawName, 50, 'name', 'a category name');
  const all = await getAll<Category>('categories');
  const clash = all.find((c) => normalizeName(c.name) === normalizeName(name));
  if (clash) {
    if (clash.archivedAt) {
      const restored = { ...clash, archivedAt: null };
      await putOne('categories', restored);
      notifyChange();
      return restored;
    }
    throw new ValidationError({ name: 'You already have a category with that name.' });
  }
  const category: Category = {
    id: newId(),
    name,
    sortOrder: all.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1,
    archivedAt: null,
    createdAt: new Date().toISOString()
  };
  await putOne('categories', category);
  notifyChange();
  return category;
}

export async function renameCategory(id: string, rawName: string): Promise<Category> {
  const name = cleanName(rawName, 50, 'name', 'a category name');
  const all = await getAll<Category>('categories');
  const current = all.find((c) => c.id === id);
  if (!current) throw new ValidationError({ name: 'That category no longer exists.' });
  if (all.some((c) => c.id !== id && normalizeName(c.name) === normalizeName(name))) {
    throw new ValidationError({ name: 'You already have a category with that name.' });
  }
  const next = { ...current, name };
  await putOne('categories', next);
  notifyChange();
  return next;
}

export async function setCategoryArchived(id: string, archived: boolean): Promise<void> {
  const all = await getAll<Category>('categories');
  const current = all.find((c) => c.id === id);
  if (!current) return;
  if (archived && all.filter((c) => !c.archivedAt && c.id !== id).length === 0) {
    throw new ValidationError({ name: 'Keep at least one active category.' });
  }
  await putOne('categories', { ...current, archivedAt: archived ? new Date().toISOString() : null });
  notifyChange();
}

export async function ensureStandardCategories(): Promise<number> {
  const all = await getAll<Category>('categories');
  const missing = missingStandardCategories(all);
  if (!missing.length) return 0;
  const now = new Date().toISOString();
  let order = all.reduce((max, c) => Math.max(max, c.sortOrder), -1) + 1;
  await runTx(['categories'], 'readwrite', (tx) => {
    for (const def of missing) tx.objectStore('categories').put({ id: newId(), name: def.name, sortOrder: order++, archivedAt: null, createdAt: now });
  });
  notifyChange();
  return missing.length;
}

export interface CycleInput {
  name: string;
  frequency: Frequency;
  startDate: string;
  endDate: string;
  allowanceCentavos: number;
  plannedSavingsCentavos: number;
}

function validateCycle(input: CycleInput, carryover: number, others: Cycle[], id: string): void {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = 'Give this cycle a name.';
  else if (input.name.trim().length > 80) errors.name = 'Keep the name under 80 characters.';
  if (!isValidDate(input.startDate)) errors.startDate = 'Choose a valid start date.';
  if (!isValidDate(input.endDate)) errors.endDate = 'Choose a valid end date.';
  if (!errors.startDate && !errors.endDate) {
    if (input.endDate < input.startDate) errors.endDate = 'The next allowance date must come after the start date.';
    else if (addDays(input.startDate, 800) < input.endDate) errors.endDate = 'A cycle can be at most about two years long.';
  }
  if (!Number.isSafeInteger(input.allowanceCentavos) || input.allowanceCentavos < 0 || input.allowanceCentavos > MAX_CENTAVOS) {
    errors.allowance = 'Enter an allowance amount of 0 or more.';
  }
  if (!Number.isSafeInteger(input.plannedSavingsCentavos) || input.plannedSavingsCentavos < 0) {
    errors.plannedSavings = 'Enter an amount of 0 or more.';
  } else if (!errors.allowance && input.plannedSavingsCentavos > input.allowanceCentavos + carryover) {
    errors.plannedSavings = 'Money set aside cannot be more than your allowance plus carryover.';
  }
  if (!errors.startDate && !errors.endDate) {
    const clash = findOverlap(others, { id, startDate: input.startDate, endDate: input.endDate });
    if (clash) errors.startDate = `These dates overlap “${clash.name}”. Cycles cannot overlap.`;
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
}

export async function createCycle(input: CycleInput, options: { carryFromCycleId?: string | null } = {}): Promise<Cycle> {
  await ensureReady();
  const [cycles, txs] = await Promise.all([getAll<Cycle>('cycles'), getAll<Transaction>('transactions')]);
  let carryover = 0;
  if (options.carryFromCycleId) {
    const previous = cycles.find((c) => c.id === options.carryFromCycleId);
    if (previous) carryover = carryoverFrom(previous, txs);
  }
  const id = newId();
  validateCycle(input, carryover, cycles, id);
  const cycle: Cycle = {
    id,
    name: input.name.trim(),
    frequency: input.frequency,
    startDate: input.startDate,
    endDate: input.endDate,
    allowanceCentavos: input.allowanceCentavos,
    carryoverCentavos: carryover,
    plannedSavingsCentavos: input.plannedSavingsCentavos,
    createdAt: new Date().toISOString()
  };
  await putOne('cycles', cycle);
  notifyChange();
  return cycle;
}

export async function updateCycle(id: string, input: CycleInput): Promise<Cycle> {
  const cycles = await getAll<Cycle>('cycles');
  const current = cycles.find((c) => c.id === id);
  if (!current) throw new ValidationError({ name: 'That cycle no longer exists.' });
  validateCycle(input, current.carryoverCentavos, cycles, id);
  const next: Cycle = {
    ...current,
    name: input.name.trim(),
    frequency: input.frequency,
    startDate: input.startDate,
    endDate: input.endDate,
    allowanceCentavos: input.allowanceCentavos,
    plannedSavingsCentavos: input.plannedSavingsCentavos
  };
  await putOne('cycles', next);
  notifyChange();
  return next;
}

export async function deleteCycle(id: string): Promise<void> {
  await runTx(['cycles', 'cycleLimits'], 'readwrite', async (tx) => {
    tx.objectStore('cycles').delete(id);
    const limits = await requestToPromise(tx.objectStore('cycleLimits').getAll() as IDBRequest<(CycleCategoryLimit & { key: string })[]>);
    for (const l of limits) if (l.cycleId === id) tx.objectStore('cycleLimits').delete(l.key);
  });
  notifyChange();
}

export async function setCycleLimit(cycleId: string, categoryId: string, limitCentavos: number | null): Promise<void> {
  const key = `${cycleId}:${categoryId}`;
  if (limitCentavos === null || limitCentavos === 0) await deleteOne('cycleLimits', key);
  else {
    if (!Number.isSafeInteger(limitCentavos) || limitCentavos < 0 || limitCentavos > MAX_CENTAVOS) {
      throw new ValidationError({ limit: 'Enter a valid limit.' });
    }
    await putOne('cycleLimits', { key, cycleId, categoryId, limitCentavos });
  }
  notifyChange();
}

export interface TransactionInput {
  amountCentavos: number;
  occurredAt: string;
  merchant: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  description?: string | null;
  source?: TxSource;
  ocrStatus?: OcrStatus;
  externalReference?: string | null;
  isSplurge?: boolean;
  receiptHashes?: string[];
}

async function validateTransaction(input: TransactionInput, existingCategoryId?: string): Promise<{ date: string }> {
  const errors: Record<string, string> = {};
  if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0) errors.amount = 'Enter an amount above ₱0.';
  else if (input.amountCentavos > MAX_CENTAVOS) errors.amount = 'That amount is too large.';
  if (!input.merchant.trim()) errors.merchant = 'Enter where you spent it.';
  else if (input.merchant.trim().length > 120) errors.merchant = 'Keep this under 120 characters.';
  const time = new Date(input.occurredAt).getTime();
  if (!Number.isFinite(time)) errors.occurredAt = 'Choose a valid date and time.';
  if ((input.description ?? '').length > 500) errors.description = 'Keep notes under 500 characters.';
  if (!PAYMENT_METHODS.some((m) => m.value === input.paymentMethod)) errors.paymentMethod = 'Choose how you paid.';
  const category = await getOne<Category>('categories', input.categoryId);
  if (!category) errors.categoryId = 'Choose a category.';
  else if (category.archivedAt && category.id !== existingCategoryId) errors.categoryId = 'That category is archived. Choose another.';
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return { date: manilaDateOf(input.occurredAt) };
}

export async function addTransaction(input: TransactionInput, options: { allowDuplicate?: boolean } = {}): Promise<Transaction> {
  await ensureReady();
  const { date } = await validateTransaction(input);
  const reference = input.externalReference?.trim() || null;
  if (!options.allowDuplicate) {
    const all = await getAll<Transaction>('transactions');
    const match = findDuplicate(all, {
      amountCentavos: input.amountCentavos,
      merchant: input.merchant,
      date,
      paymentMethod: input.paymentMethod,
      externalReference: reference
    });
    if (match) throw new DuplicateError(match);
  }
  const now = new Date().toISOString();
  const tx: Transaction = {
    id: newId(),
    amountCentavos: input.amountCentavos,
    occurredAt: new Date(input.occurredAt).toISOString(),
    date,
    merchant: input.merchant.trim().replace(/\s+/g, ' '),
    categoryId: input.categoryId,
    paymentMethod: input.paymentMethod,
    description: input.description?.trim() || null,
    source: input.source ?? 'manual',
    ocrStatus: input.ocrStatus ?? (input.source && input.source !== 'manual' ? 'succeeded' : 'not_applicable'),
    externalReference: reference,
    isSplurge: input.isSplurge ?? false,
    receiptHashes: input.receiptHashes ?? [],
    createdAt: now,
    updatedAt: now
  };
  await putOne('transactions', tx);
  notifyChange();
  return tx;
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<Transaction> {
  const current = await getOne<Transaction>('transactions', id);
  if (!current) throw new ValidationError({ merchant: 'That expense no longer exists.' });
  const { date } = await validateTransaction(input, current.categoryId);
  const next: Transaction = {
    ...current,
    amountCentavos: input.amountCentavos,
    occurredAt: new Date(input.occurredAt).toISOString(),
    date,
    merchant: input.merchant.trim().replace(/\s+/g, ' '),
    categoryId: input.categoryId,
    paymentMethod: input.paymentMethod,
    description: input.description?.trim() || null,
    externalReference: input.externalReference?.trim() || null,
    isSplurge: input.isSplurge ?? current.isSplurge,
    receiptHashes: input.receiptHashes ?? current.receiptHashes,
    updatedAt: new Date().toISOString()
  };
  await putOne('transactions', next);
  await pruneReceipts(current.receiptHashes.filter((h) => !next.receiptHashes.includes(h)));
  notifyChange();
  return next;
}

export async function deleteTransaction(id: string): Promise<void> {
  const current = await getOne<Transaction>('transactions', id);
  await deleteOne('transactions', id);
  if (current) await pruneReceipts(current.receiptHashes);
  notifyChange();
}

export async function setSplurge(id: string, isSplurge: boolean): Promise<void> {
  const current = await getOne<Transaction>('transactions', id);
  if (!current) return;
  await putOne('transactions', { ...current, isSplurge, updatedAt: new Date().toISOString() });
  notifyChange();
}

export async function addGoal(input: { name: string; targetCentavos: number; targetDate: string | null }): Promise<SavingsGoal> {
  await ensureReady();
  const errors: Record<string, string> = {};
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) errors.name = 'Name your goal.';
  else if (name.length > 80) errors.name = 'Keep the name under 80 characters.';
  if (!Number.isSafeInteger(input.targetCentavos) || input.targetCentavos <= 0) errors.target = 'Enter a target above ₱0.';
  if (input.targetDate && !isValidDate(input.targetDate)) errors.targetDate = 'Choose a valid date.';
  if (Object.keys(errors).length) throw new ValidationError(errors);
  const goal: SavingsGoal = { id: newId(), name, targetCentavos: input.targetCentavos, targetDate: input.targetDate || null, createdAt: new Date().toISOString() };
  await putOne('goals', goal);
  notifyChange();
  return goal;
}

export async function deleteGoal(id: string): Promise<void> {
  await runTx(['goals', 'contributions'], 'readwrite', async (tx) => {
    tx.objectStore('goals').delete(id);
    const all = await requestToPromise(tx.objectStore('contributions').getAll() as IDBRequest<SavingsContribution[]>);
    for (const c of all) if (c.goalId === id) tx.objectStore('contributions').delete(c.id);
  });
  notifyChange();
}

export async function addContribution(goalId: string, amountCentavos: number): Promise<SavingsContribution> {
  if (!Number.isSafeInteger(amountCentavos) || amountCentavos <= 0) throw new ValidationError({ amount: 'Enter an amount above ₱0.' });
  const goal = await getOne<SavingsGoal>('goals', goalId);
  if (!goal) throw new ValidationError({ amount: 'That goal no longer exists.' });
  const contribution: SavingsContribution = { id: newId(), goalId, amountCentavos, contributedAt: new Date().toISOString() };
  await putOne('contributions', contribution);
  notifyChange();
  return contribution;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Saving images needs a secure (HTTPS) connection.');
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function saveReceipt(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hash = await sha256Hex(buffer);
  const record: ReceiptRecord = { hash, mime: blob.type || 'image/jpeg', size: buffer.byteLength, buffer, createdAt: new Date().toISOString() };
  await putOne('receipts', record);
  return hash;
}

export async function getReceiptBlob(hash: string): Promise<Blob | null> {
  const record = await getOne<ReceiptRecord>('receipts', hash);
  return record ? new Blob([record.buffer], { type: record.mime }) : null;
}

export async function hasReceipt(hash: string): Promise<boolean> {
  return (await getOne<ReceiptRecord>('receipts', hash)) !== undefined;
}

export async function listReceiptRecords(): Promise<ReceiptRecord[]> {
  return getAll<ReceiptRecord>('receipts');
}

async function pruneReceipts(hashes: string[]): Promise<void> {
  if (!hashes.length) return;
  const txs = await getAll<Transaction>('transactions');
  const used = new Set(txs.flatMap((t) => t.receiptHashes));
  for (const h of hashes) if (!used.has(h)) await deleteOne('receipts', h);
}

export async function dropReceiptIfUnused(hash: string): Promise<void> {
  await pruneReceipts([hash]);
}

export async function countOcrImportsInRange(startDate: string, endDate: string): Promise<number> {
  const all = await getAll<Transaction>('transactions');
  return all.filter((t) => t.source !== 'manual' && t.date >= startDate && t.date <= endDate).length;
}

export async function wipeAllData(options: { reseed?: boolean } = {}): Promise<void> {
  const stores: StoreName[] = [...DATA_STORES, 'receipts'];
  await runTx([...stores, 'settings'], 'readwrite', (tx) => {
    for (const s of stores) tx.objectStore(s).clear();
    tx.objectStore('settings').delete('app');
  });
  ready = null;
  if (options.reseed !== false) await ensureReady();
  notifyChange();
}
