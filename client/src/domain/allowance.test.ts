import { describe, expect, it } from 'vitest';
import {
  carryoverFrom,
  cycleForDate,
  cycleStatus,
  endDateFromNextAllowance,
  expensesInCycle,
  findOverlap,
  nextAllowanceDate,
  pickCurrentCycle,
  spendableCentavos,
  summarizeCycle
} from './allowance';
import type { Cycle, Transaction } from './types';

const cycle = (over: Partial<Cycle> = {}): Cycle => ({
  id: 'c1',
  name: 'Cycle',
  frequency: 'biweekly',
  startDate: '2026-11-01',
  endDate: '2026-11-14',
  allowanceCentavos: 140000,
  carryoverCentavos: 0,
  plannedSavingsCentavos: 0,
  createdAt: '2026-10-31T00:00:00.000Z',
  ...over
});

let n = 0;
const tx = (date: string, amountCentavos: number, over: Partial<Transaction> = {}): Transaction => ({
  id: `t${++n}`,
  amountCentavos,
  occurredAt: `${date}T04:00:00.000Z`,
  date,
  merchant: 'Store',
  categoryId: 'cat',
  paymentMethod: 'cash',
  description: null,
  source: 'manual',
  ocrStatus: 'not_applicable',
  externalReference: null,
  isSplurge: false,
  receiptHashes: [],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...over
});

describe('remaining balance', () => {
  it('equals allowance plus carryover minus planned savings minus expenses', () => {
    const c = cycle({ allowanceCentavos: 200050, carryoverCentavos: 5000, plannedSavingsCentavos: 10000 });
    expect(spendableCentavos(c)).toBe(195050);
    const s = summarizeCycle(c, [tx('2026-11-02', 12540), tx('2026-11-03', 6000)], '2026-11-03');
    expect(s.spentCentavos).toBe(18540);
    expect(s.remainingCentavos).toBe(176510);
  });
});

describe('daily safe-spending limit', () => {
  it('divides the remaining balance by remaining days, counting today and the end date', () => {
    const s = summarizeCycle(cycle(), [], '2026-11-01');
    expect(s.daysRemaining).toBe(14);
    expect(s.dailySafeLimitCentavos).toBe(10000);
    const mid = summarizeCycle(cycle(), [tx('2026-11-01', 20000)], '2026-11-08');
    expect(mid.daysRemaining).toBe(7);
    expect(mid.dailySafeLimitCentavos).toBe(17142);
    expect(mid.dailySafeLimitCentavos! * mid.daysRemaining).toBeLessThanOrEqual(mid.remainingCentavos);
  });

  it('is one day on the final day', () => {
    const s = summarizeCycle(cycle(), [tx('2026-11-05', 100000)], '2026-11-14');
    expect(s.daysRemaining).toBe(1);
    expect(s.dailySafeLimitCentavos).toBe(40000);
  });

  it('is null once the cycle has ended and never divides by zero', () => {
    const s = summarizeCycle(cycle(), [tx('2026-11-02', 5000)], '2026-11-15');
    expect(s.status).toBe('ended');
    expect(s.daysRemaining).toBe(0);
    expect(s.dailySafeLimitCentavos).toBeNull();
    expect(s.pace).toBe('ended');
  });

  it('is zero when the balance is zero or negative', () => {
    const zero = summarizeCycle(cycle(), [tx('2026-11-02', 140000)], '2026-11-03');
    expect(zero.remainingCentavos).toBe(0);
    expect(zero.dailySafeLimitCentavos).toBe(0);
    const over = summarizeCycle(cycle(), [tx('2026-11-02', 150000)], '2026-11-03');
    expect(over.remainingCentavos).toBe(-10000);
    expect(over.dailySafeLimitCentavos).toBe(0);
    expect(over.pace).toBe('over_budget');
    expect(over.percentUsed).toBeGreaterThan(100);
  });

  it('handles a future cycle with its full length', () => {
    const s = summarizeCycle(cycle({ startDate: '2026-11-10', endDate: '2026-11-23' }), [], '2026-11-01');
    expect(s.status).toBe('upcoming');
    expect(s.daysUntilStart).toBe(9);
    expect(s.daysRemaining).toBe(14);
    expect(s.daysElapsed).toBe(0);
    expect(s.dailySafeLimitCentavos).toBe(10000);
    expect(s.pace).toBe('not_started');
  });

  it('rounds down so centavos are never overspent', () => {
    const s = summarizeCycle(cycle({ allowanceCentavos: 10000, startDate: '2026-11-01', endDate: '2026-11-03' }), [], '2026-11-01');
    expect(s.dailySafeLimitCentavos).toBe(3333);
  });

  it('tracks spending today separately', () => {
    const s = summarizeCycle(cycle(), [tx('2026-11-04', 1500), tx('2026-11-04', 2500), tx('2026-11-03', 9999)], '2026-11-04');
    expect(s.spentTodayCentavos).toBe(4000);
  });
});

describe('pace', () => {
  it('flags above-pace spending with neutral states only', () => {
    const on = summarizeCycle(cycle(), [tx('2026-11-01', 10000)], '2026-11-01');
    expect(on.pace).toBe('on_track');
    const above = summarizeCycle(cycle(), [tx('2026-11-01', 10001)], '2026-11-01');
    expect(above.pace).toBe('above_pace');
  });

  it('projects the end balance from the average daily spend', () => {
    const s = summarizeCycle(cycle(), [tx('2026-11-01', 10000), tx('2026-11-02', 10000)], '2026-11-02');
    expect(s.averageDailyCentavos).toBe(10000);
    expect(s.daysRemaining).toBe(13);
    expect(s.projectedEndCentavos).toBe(120000 - 10000 * 13);
  });
});

describe('cycle boundaries and edits', () => {
  it('counts expenses on the first and last day inclusively', () => {
    const c = cycle();
    expect(expensesInCycle(c, [tx('2026-10-31', 100), tx('2026-11-01', 200), tx('2026-11-14', 400), tx('2026-11-15', 800)])).toBe(600);
  });

  it('moves an expense between cycles when its date is edited', () => {
    const a = cycle({ id: 'a', startDate: '2026-11-01', endDate: '2026-11-14' });
    const b = cycle({ id: 'b', startDate: '2026-11-15', endDate: '2026-11-28' });
    const moved = tx('2026-11-14', 5000);
    expect(summarizeCycle(a, [moved], '2026-11-20').spentCentavos).toBe(5000);
    const edited = { ...moved, date: '2026-11-15' };
    expect(summarizeCycle(a, [edited], '2026-11-20').spentCentavos).toBe(0);
    expect(summarizeCycle(b, [edited], '2026-11-20').spentCentavos).toBe(5000);
  });

  it('classifies status on the boundary days', () => {
    const c = cycle();
    expect(cycleStatus(c, '2026-10-31')).toBe('upcoming');
    expect(cycleStatus(c, '2026-11-01')).toBe('active');
    expect(cycleStatus(c, '2026-11-14')).toBe('active');
    expect(cycleStatus(c, '2026-11-15')).toBe('ended');
  });

  it('detects overlapping cycles but allows adjacent ones', () => {
    const a = cycle({ id: 'a' });
    expect(findOverlap([a], { id: 'x', startDate: '2026-11-14', endDate: '2026-11-20' })?.id).toBe('a');
    expect(findOverlap([a], { id: 'x', startDate: '2026-11-15', endDate: '2026-11-20' })).toBeNull();
    expect(findOverlap([a], { id: 'a', startDate: '2026-11-05', endDate: '2026-11-20' })).toBeNull();
  });

  it('finds the cycle covering a date', () => {
    const a = cycle({ id: 'a' });
    const b = cycle({ id: 'b', startDate: '2026-11-15', endDate: '2026-11-28' });
    expect(cycleForDate([a, b], '2026-11-15')?.id).toBe('b');
    expect(cycleForDate([a, b], '2026-12-01')).toBeNull();
  });
});

describe('choosing the current cycle', () => {
  const a = cycle({ id: 'a', startDate: '2026-10-01', endDate: '2026-10-14' });
  const b = cycle({ id: 'b', startDate: '2026-11-01', endDate: '2026-11-14' });
  it('prefers the active cycle', () => {
    expect(pickCurrentCycle([a, b], '2026-11-05')).toMatchObject({ status: 'active', cycle: { id: 'b' } });
  });
  it('falls back to the nearest upcoming or most recent ended cycle', () => {
    expect(pickCurrentCycle([a, b], '2026-10-31')).toMatchObject({ status: 'upcoming', cycle: { id: 'b' } });
    expect(pickCurrentCycle([a, b], '2026-10-16')).toMatchObject({ status: 'ended', cycle: { id: 'a' } });
    expect(pickCurrentCycle([a], '2026-12-01')).toMatchObject({ status: 'ended', cycle: { id: 'a' } });
    expect(pickCurrentCycle([], '2026-12-01')).toBeNull();
  });
});

describe('carryover and next-allowance dates', () => {
  it('carries over only a positive remainder', () => {
    expect(carryoverFrom(cycle(), [tx('2026-11-02', 40000)])).toBe(100000);
    expect(carryoverFrom(cycle(), [tx('2026-11-02', 200000)])).toBe(0);
  });

  it('derives end dates from the next allowance date', () => {
    expect(nextAllowanceDate('weekly', '2026-11-01')).toBe('2026-11-08');
    expect(nextAllowanceDate('biweekly', '2026-11-01')).toBe('2026-11-15');
    expect(nextAllowanceDate('monthly', '2026-01-31')).toBe('2026-02-28');
    expect(nextAllowanceDate('custom', '2026-11-01')).toBeNull();
    expect(endDateFromNextAllowance('2026-11-15')).toBe('2026-11-14');
  });
});
