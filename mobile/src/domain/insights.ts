import { addDays, daysInclusive, startOfMonth, weekStart } from './dates';
import type { Centavos } from './money';
import type { PaymentMethod, Transaction } from './types';

export function inRange(txs: Transaction[], from: string, to: string): Transaction[] {
  return txs.filter((t) => t.date >= from && t.date <= to);
}

export function totalsBy<K extends string>(txs: Transaction[], key: (t: Transaction) => K): { key: K; total: Centavos; count: number }[] {
  const map = new Map<K, { total: Centavos; count: number }>();
  for (const t of txs) {
    const entry = map.get(key(t)) ?? { total: 0, count: 0 };
    entry.total += t.amountCentavos;
    entry.count += 1;
    map.set(key(t), entry);
  }
  return [...map].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.total - a.total);
}

export const byCategory = (txs: Transaction[]) => totalsBy(txs, (t) => t.categoryId);
export const byMethod = (txs: Transaction[]) => totalsBy<PaymentMethod>(txs, (t) => t.paymentMethod);

export type Bucket = 'day' | 'week' | 'month';

export function bucketKey(date: string, bucket: Bucket): string {
  return bucket === 'day' ? date : bucket === 'week' ? weekStart(date) : startOfMonth(date);
}

export function series(txs: Transaction[], from: string, to: string, bucket: Bucket): { key: string; total: Centavos }[] {
  const totals = new Map<string, Centavos>();
  for (const t of txs) totals.set(t.date, (totals.get(t.date) ?? 0) + t.amountCentavos);
  const out = new Map<string, Centavos>();
  const days = daysInclusive(from, to);
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    const k = bucketKey(d, bucket);
    out.set(k, (out.get(k) ?? 0) + (totals.get(d) ?? 0));
  }
  return [...out].map(([key, total]) => ({ key, total }));
}

export function groupByDay(txs: Transaction[]): { date: string; total: Centavos; items: Transaction[] }[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of txs) {
    const list = groups.get(t.date) ?? [];
    list.push(t);
    groups.set(t.date, list);
  }
  return [...groups]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({ date, items, total: items.reduce((s, t) => s + t.amountCentavos, 0) }));
}

export function splurgeTotals(txs: Transaction[]): { total: Centavos; count: number } {
  const flagged = txs.filter((t) => t.isSplurge);
  return { total: flagged.reduce((s, t) => s + t.amountCentavos, 0), count: flagged.length };
}
