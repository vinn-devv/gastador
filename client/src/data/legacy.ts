import { legacyDateToManila, manilaDateOf } from '../domain/dates';
import { parseDecimalString } from '../domain/money';
import { defaultSettings, type CurrencyCode, type OcrStatus, type PaymentMethod, type TxSource } from '../domain/types';
import { applyData, BackupError, checkIntegrity, type BackupData, type RestoreReport } from './backup';
import { getAll, putOne, requestToPromise } from './db';
import { ensureStandardCategories, getMeta, setMeta, type ReceiptRecord } from './repo';

export interface LegacyReport {
  warnings: string[];
  counts: { categories: number; cycles: number; transactions: number; goals: number; contributions: number };
}

type Row = Record<string, unknown>;

const rows = (value: unknown): Row[] => (Array.isArray(value) ? (value.filter((v) => typeof v === 'object' && v !== null) as Row[]) : []);
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const METHODS: PaymentMethod[] = ['gcash', 'maya', 'cash', 'bank_transfer', 'other'];
const OCR: OcrStatus[] = ['not_applicable', 'succeeded', 'corrected', 'failed'];
const SOURCES: TxSource[] = ['manual', 'screenshot', 'receipt'];
const CURRENCIES: CurrencyCode[] = ['PHP', 'USD', 'EUR', 'SGD'];
const LEGACY_DEFAULT_NAMES: Record<string, string> = {
  'food and drinks': 'Food',
  transportation: 'Transport',
  'school expenses': 'School Supplies',
  'bills and utilities': 'Bills',
  'health and personal care': 'Personal'
};

export function isLegacyExport(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Row;
  return Array.isArray(r.categories) && Array.isArray(r.cycles) && Array.isArray(r.transactions) && typeof r.user === 'object' && (r as Row).app !== 'gastador';
}

export function convertLegacyExport(raw: unknown): { data: BackupData; report: LegacyReport } {
  if (!isLegacyExport(raw)) throw new BackupError('That file does not look like a Gastador online-account export.');
  const src = raw as Row;
  const warnings: string[] = [];
  const user = (src.user ?? {}) as Row;
  const now = new Date().toISOString();

  const savingsCategoryIds = new Set<string>();
  const categories = rows(src.categories)
    .filter((c) => {
      if (c.is_savings === true) {
        savingsCategoryIds.add(str(c.id));
        return false;
      }
      return true;
    })
    .map((c, i) => ({
      id: str(c.id),
      name: LEGACY_DEFAULT_NAMES[str(c.name).trim().toLowerCase()] ?? (str(c.name).trim().slice(0, 50) || 'Category'),
      sortOrder: typeof c.sort_order === 'number' ? c.sort_order : i,
      archivedAt: c.archived_at ? new Date(str(c.archived_at)).toISOString() : null,
      createdAt: c.created_at ? new Date(str(c.created_at)).toISOString() : now
    }));
  if (savingsCategoryIds.size) warnings.push('The old “Savings” category was not copied. Savings now live under Savings goals, separate from expenses.');
  const categoryIds = new Set(categories.map((c) => c.id));

  const cycles: BackupData['cycles'] = [];
  for (const c of rows(src.cycles)) {
    const start = legacyDateToManila(str(c.start_date));
    const end = legacyDateToManila(str(c.end_date));
    if (!start || !end || end < start) {
      warnings.push(`Skipped cycle “${str(c.name)}” because its dates could not be read.`);
      continue;
    }
    const frequency = ['weekly', 'biweekly', 'monthly', 'custom'].includes(str(c.frequency)) ? (str(c.frequency) as 'weekly') : 'custom';
    cycles.push({
      id: str(c.id),
      name: str(c.name).trim().slice(0, 80) || 'Cycle',
      frequency,
      startDate: start,
      endDate: end,
      allowanceCentavos: parseDecimalString(str(c.total_amount)),
      carryoverCentavos: parseDecimalString(str(c.carried_over_amount)),
      plannedSavingsCentavos: parseDecimalString(str(c.savings_allocation)),
      createdAt: c.created_at ? new Date(str(c.created_at)).toISOString() : now
    });
  }
  const cycleIds = new Set(cycles.map((c) => c.id));

  const cycleLimits = rows(src.cycle_category_budgets)
    .filter((l) => cycleIds.has(str(l.cycle_id)) && categoryIds.has(str(l.category_id)) && l.limit_amount != null)
    .map((l) => ({ cycleId: str(l.cycle_id), categoryId: str(l.category_id), limitCentavos: parseDecimalString(str(l.limit_amount)) }))
    .filter((l) => l.limitCentavos > 0);

  const hashesByTx = new Map<string, string[]>();
  for (const r of rows(src.receipts)) {
    const hash = str(r.sha256).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hash)) continue;
    const list = hashesByTx.get(str(r.transaction_id)) ?? [];
    list.push(hash);
    hashesByTx.set(str(r.transaction_id), list);
  }

  const transactions: BackupData['transactions'] = [];
  let skippedTx = 0;
  for (const t of rows(src.transactions)) {
    const occurred = new Date(str(t.occurred_at));
    const amount = parseDecimalString(str(t.amount));
    if (!categoryIds.has(str(t.category_id)) || !Number.isFinite(occurred.getTime()) || amount <= 0) {
      skippedTx++;
      continue;
    }
    const method = METHODS.includes(str(t.payment_method) as PaymentMethod) ? (str(t.payment_method) as PaymentMethod) : 'other';
    const source = SOURCES.includes(str(t.source) as TxSource) ? (str(t.source) as TxSource) : 'manual';
    const ocr = OCR.includes(str(t.ocr_status) as OcrStatus) ? (str(t.ocr_status) as OcrStatus) : 'not_applicable';
    transactions.push({
      id: str(t.id),
      amountCentavos: amount,
      occurredAt: occurred.toISOString(),
      date: manilaDateOf(occurred),
      merchant: str(t.merchant).trim().slice(0, 120) || 'Unknown',
      categoryId: str(t.category_id),
      paymentMethod: method,
      description: t.description ? str(t.description).slice(0, 500) : null,
      source,
      ocrStatus: ocr,
      externalReference: t.external_reference ? str(t.external_reference).slice(0, 120) : null,
      isSplurge: t.is_splurge === true,
      receiptHashes: hashesByTx.get(str(t.id)) ?? [],
      createdAt: t.created_at ? new Date(str(t.created_at)).toISOString() : now,
      updatedAt: t.updated_at ? new Date(str(t.updated_at)).toISOString() : now
    });
  }
  if (skippedTx) warnings.push(`${skippedTx} expense${skippedTx === 1 ? '' : 's'} could not be read and ${skippedTx === 1 ? 'was' : 'were'} skipped.`);

  const goals = rows(src.savings_goals).map((g) => ({
    id: str(g.id),
    name: str(g.name).trim().slice(0, 80) || 'Goal',
    targetCentavos: Math.max(1, parseDecimalString(str(g.target_amount))),
    targetDate: g.target_date ? legacyDateToManila(str(g.target_date)) : null,
    createdAt: g.created_at ? new Date(str(g.created_at)).toISOString() : now
  }));
  const goalIds = new Set(goals.map((g) => g.id));
  const contributions = rows(src.savings_contributions)
    .filter((c) => goalIds.has(str(c.goal_id)) && parseDecimalString(str(c.amount)) > 0)
    .map((c) => ({
      id: str(c.id),
      goalId: str(c.goal_id),
      amountCentavos: parseDecimalString(str(c.amount)),
      contributedAt: c.contributed_at ? new Date(str(c.contributed_at)).toISOString() : now
    }));

  const currency = str(user.currency).toUpperCase();
  if (currency && !CURRENCIES.includes(currency as CurrencyCode)) warnings.push(`Your old account used ${currency}. Gastador now shows amounts in pesos; the numbers were kept as they are.`);
  const n = (user.notifications ?? {}) as Row;
  const defaults = defaultSettings().alerts;
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  const days = typeof n.cycle_ending_days === 'number' ? Math.min(14, Math.max(1, Math.round(n.cycle_ending_days))) : defaults.cycleEndingDays;
  const time = /^([01]\d|2[0-3]):[0-5]\d/.test(str(n.daily_reminder_time)) ? str(n.daily_reminder_time).slice(0, 5) : defaults.dailyReminderTime;
  const settings: BackupData['settings'] = {
    displayName: str(user.display_name).slice(0, 80),
    currency: CURRENCIES.includes(currency as CurrencyCode) ? (currency as CurrencyCode) : 'PHP',
    theme: ['system', 'light', 'dark'].includes(str(user.theme)) ? (str(user.theme) as 'system') : 'system',
    budgetMethod: ['daily_pace', 'category_limits', 'simple_total'].includes(str(user.budget_method)) ? (str(user.budget_method) as 'daily_pace') : 'daily_pace',
    onboardingCompleted: cycles.length > 0 || transactions.length > 0 || user.onboarding_completed === true,
    alerts: {
      dailyReminder: bool(n.daily_reminder, defaults.dailyReminder),
      dailyReminderTime: time,
      budget50: bool(n.budget_50, defaults.budget50),
      budget75: bool(n.budget_75, defaults.budget75),
      budget90: bool(n.budget_90, defaults.budget90),
      budget100: bool(n.budget_100, defaults.budget100),
      categoryOverspend: bool(n.category_overspend, defaults.categoryOverspend),
      cycleEndingSoon: bool(n.cycle_ending_soon, defaults.cycleEndingSoon),
      cycleEndingDays: days,
      savingsProgress: bool(n.savings_progress, defaults.savingsProgress)
    },
    createdAt: user.created_at ? new Date(str(user.created_at)).toISOString() : now
  };

  const data: BackupData = { settings, categories, cycles, cycleLimits, transactions, goals, contributions };
  checkIntegrity(data);
  return {
    data,
    report: { warnings, counts: { categories: categories.length, cycles: cycles.length, transactions: transactions.length, goals: goals.length, contributions: contributions.length } }
  };
}

export async function importLegacyExport(raw: unknown): Promise<{ restore: RestoreReport; legacy: LegacyReport }> {
  const { data, report } = convertLegacyExport(raw);
  const restore = await applyData(data, [], 'merge');
  const added = await ensureStandardCategories();
  if (added) restore.categories += added;
  return { restore, legacy: report };
}

export class LegacyLoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LegacyLoginError';
  }
}

export async function fetchLegacyExport(email: string, password: string, base = ''): Promise<unknown> {
  const call = async (path: string, init?: RequestInit) => {
    try {
      return await fetch(`${base}/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init });
    } catch {
      throw new LegacyLoginError('Could not reach your old Gastador server. Make sure it is running and that you opened this app from the same address.');
    }
  };
  const login = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (login.status === 401) throw new LegacyLoginError('Wrong email or password.');
  if (login.status === 429) throw new LegacyLoginError('Too many attempts. Wait a few minutes and try again.');
  if (!login.ok) throw new LegacyLoginError('The old server did not accept the sign-in. Is this the right address?');
  try {
    const exported = await call('/me/export');
    if (!exported.ok) throw new LegacyLoginError('The old server could not produce your export.');
    return await exported.json();
  } finally {
    await call('/auth/logout', { method: 'POST' }).catch(() => undefined);
  }
}

const LEGACY_DB = 'gastador-receipts';

export async function migrateLegacyReceiptImages(): Promise<number> {
  if (typeof indexedDB === 'undefined' || (await getMeta<boolean>('legacyReceiptsCopied'))) return 0;
  const factory = indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> };
  if (typeof factory.databases !== 'function') return 0;
  const names = (await factory.databases()).map((d) => d.name);
  if (!names.includes(LEGACY_DB)) {
    await setMeta('legacyReceiptsCopied', true);
    return 0;
  }
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(LEGACY_DB);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  let copied = 0;
  try {
    if (!db.objectStoreNames.contains('blobs')) return 0;
    const store = db.transaction('blobs').objectStore('blobs');
    const keys = (await requestToPromise(store.getAllKeys())) as string[];
    const values = (await requestToPromise(store.getAll())) as Blob[];
    const have = new Set((await getAll<ReceiptRecord>('receipts')).map((r) => r.hash));
    for (const [i, key] of keys.entries()) {
      const blob = values[i];
      if (!/^[a-f0-9]{64}$/.test(String(key)) || !(blob instanceof Blob) || have.has(String(key))) continue;
      const buffer = await blob.arrayBuffer();
      await putOne('receipts', { hash: String(key), mime: blob.type || 'image/jpeg', size: buffer.byteLength, buffer, createdAt: new Date().toISOString() } satisfies ReceiptRecord);
      copied++;
    }
  } finally {
    db.close();
  }
  await setMeta('legacyReceiptsCopied', true);
  return copied;
}
