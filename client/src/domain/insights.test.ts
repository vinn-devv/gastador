import { describe, expect, it } from 'vitest';
import { computeAlerts } from './alerts';
import { summarizeCycle } from './allowance';
import { byCategory, groupByDay, inRange, series, splurgeTotals } from './insights';
import { DEFAULT_ALERTS, type Cycle, type Transaction } from './types';

let n = 0;
const tx = (date: string, amountCentavos: number, over: Partial<Transaction> = {}): Transaction => ({
  id: `t${++n}`,
  amountCentavos,
  occurredAt: `${date}T04:00:00.000Z`,
  date,
  merchant: 'Store',
  categoryId: 'food',
  paymentMethod: 'cash',
  description: null,
  source: 'manual',
  ocrStatus: 'not_applicable',
  externalReference: null,
  isSplurge: false,
  receiptHashes: [],
  createdAt: '',
  updatedAt: '',
  ...over
});

describe('insights', () => {
  const txs = [tx('2026-11-01', 1000), tx('2026-11-01', 500, { categoryId: 'bills', isSplurge: true }), tx('2026-11-03', 2500), tx('2026-12-01', 700)];

  it('filters ranges inclusively and totals by category', () => {
    expect(inRange(txs, '2026-11-01', '2026-11-03')).toHaveLength(3);
    expect(byCategory(txs)).toEqual([
      { key: 'food', total: 4200, count: 3 },
      { key: 'bills', total: 500, count: 1 }
    ]);
  });

  it('builds a zero-filled daily series and buckets weeks and months', () => {
    const daily = series(txs, '2026-11-01', '2026-11-04', 'day');
    expect(daily.map((d) => d.total)).toEqual([1500, 0, 2500, 0]);
    expect(series(txs, '2026-10-26', '2026-11-08', 'week').map((w) => w.total)).toEqual([1500, 2500]);
    expect(series(txs, '2026-11-01', '2026-12-31', 'month').map((m) => m.total)).toEqual([4000, 700]);
  });

  it('groups by day newest first and totals tagged splurges', () => {
    const groups = groupByDay(txs);
    expect(groups[0].date).toBe('2026-12-01');
    expect(groups.find((g) => g.date === '2026-11-01')?.total).toBe(1500);
    expect(splurgeTotals(txs)).toEqual({ total: 500, count: 1 });
  });
});

describe('alerts', () => {
  const cycle: Cycle = { id: 'c', name: 'C', frequency: 'biweekly', startDate: '2026-11-01', endDate: '2026-11-14', allowanceCentavos: 100000, carryoverCentavos: 0, plannedSavingsCentavos: 0, createdAt: '' };
  const run = (txList: Transaction[], today: string, hm = '09:00', prefs = DEFAULT_ALERTS, limits: { cycleId: string; categoryId: string; limitCentavos: number }[] = []) =>
    computeAlerts({ cycle, summary: summarizeCycle(cycle, txList, today), prefs, limits, categories: [{ id: 'food', name: 'Food', sortOrder: 0, archivedAt: null, createdAt: '' }], transactions: txList, today, nowHourMinute: hm });

  it('reports only the highest crossed threshold, in neutral wording', () => {
    const a = run([tx('2026-11-02', 80000)], '2026-11-02');
    expect(a.map((x) => x.id)).toContain('budget-75');
    expect(a.map((x) => x.id)).not.toContain('budget-50');
    expect(a.every((x) => !/overspend|bad|waste|careless/i.test(x.text))).toBe(true);
  });

  it('respects turned-off preferences', () => {
    const a = run([tx('2026-11-02', 80000)], '2026-11-02', '09:00', { ...DEFAULT_ALERTS, budget75: false });
    expect(a.find((x) => x.id.startsWith('budget'))).toBeUndefined();
  });

  it('flags category limits, an ending cycle, and a missing daily log', () => {
    const a = run([tx('2026-11-12', 6000)], '2026-11-13', '21:00', { ...DEFAULT_ALERTS, dailyReminder: true }, [{ cycleId: 'c', categoryId: 'food', limitCentavos: 5000 }]);
    const ids = a.map((x) => x.id);
    expect(ids).toContain('limit-food');
    expect(ids).toContain('ending');
    expect(ids).toContain('reminder');
  });

  it('shows nothing outside an active cycle', () => {
    expect(run([], '2026-11-20')).toEqual([]);
  });
});
