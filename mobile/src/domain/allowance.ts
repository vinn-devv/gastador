import { addDays, addMonths, compareDates, daysInclusive, diffDays } from './dates';
import { divFloor, divRoundHalfUp, ratioPercent, type Centavos } from './money';
import type { Cycle, Frequency, Transaction } from './types';

export type CycleStatus = 'upcoming' | 'active' | 'ended';
export type PaceState = 'not_started' | 'on_track' | 'above_pace' | 'over_budget' | 'ended';

export interface CycleSummary {
  status: CycleStatus;
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  daysUntilStart: number;
  spendableCentavos: Centavos;
  spentCentavos: Centavos;
  remainingCentavos: Centavos;
  spentTodayCentavos: Centavos;
  dailySafeLimitCentavos: Centavos | null;
  plannedDailyCentavos: Centavos;
  averageDailyCentavos: Centavos;
  projectedEndCentavos: Centavos;
  percentUsed: number;
  pace: PaceState;
}

export function spendableCentavos(cycle: Cycle): Centavos {
  return cycle.allowanceCentavos + cycle.carryoverCentavos - cycle.plannedSavingsCentavos;
}

export function cycleStatus(cycle: Pick<Cycle, 'startDate' | 'endDate'>, today: string): CycleStatus {
  if (today < cycle.startDate) return 'upcoming';
  if (today > cycle.endDate) return 'ended';
  return 'active';
}

export function cycleLengthDays(cycle: Pick<Cycle, 'startDate' | 'endDate'>): number {
  return daysInclusive(cycle.startDate, cycle.endDate);
}

export function transactionsInCycle(cycle: Pick<Cycle, 'startDate' | 'endDate'>, txs: Transaction[]): Transaction[] {
  return txs.filter((t) => t.date >= cycle.startDate && t.date <= cycle.endDate);
}

export function expensesInCycle(cycle: Pick<Cycle, 'startDate' | 'endDate'>, txs: Transaction[]): Centavos {
  let total = 0;
  for (const t of txs) if (t.date >= cycle.startDate && t.date <= cycle.endDate) total += t.amountCentavos;
  return total;
}

export function summarizeCycle(cycle: Cycle, txs: Transaction[], today: string): CycleSummary {
  const status = cycleStatus(cycle, today);
  const totalDays = cycleLengthDays(cycle);
  const daysElapsed = status === 'upcoming' ? 0 : Math.min(totalDays, daysInclusive(cycle.startDate, today));
  const daysRemaining = status === 'ended' ? 0 : status === 'upcoming' ? totalDays : daysInclusive(today, cycle.endDate);
  const daysUntilStart = status === 'upcoming' ? diffDays(today, cycle.startDate) : 0;
  const spendable = spendableCentavos(cycle);
  const inCycle = transactionsInCycle(cycle, txs);
  let spent = 0;
  let spentToday = 0;
  for (const t of inCycle) {
    spent += t.amountCentavos;
    if (t.date === today) spentToday += t.amountCentavos;
  }
  const remaining = spendable - spent;
  const plannedDaily = spendable > 0 ? divFloor(spendable, totalDays) : 0;
  const averageDaily = daysElapsed > 0 ? divRoundHalfUp(spent, daysElapsed) : 0;
  const dailySafeLimit = status === 'ended' ? null : remaining > 0 ? divFloor(remaining, daysRemaining) : 0;
  const projectedEnd = status === 'active' ? remaining - averageDaily * daysRemaining : remaining;
  let pace: PaceState;
  if (status === 'ended') pace = 'ended';
  else if (status === 'upcoming') pace = 'not_started';
  else if (remaining < 0) pace = 'over_budget';
  else if (spent * totalDays > spendable * daysElapsed) pace = 'above_pace';
  else pace = 'on_track';
  return {
    status,
    totalDays,
    daysElapsed,
    daysRemaining,
    daysUntilStart,
    spendableCentavos: spendable,
    spentCentavos: spent,
    remainingCentavos: remaining,
    spentTodayCentavos: spentToday,
    dailySafeLimitCentavos: dailySafeLimit,
    plannedDailyCentavos: plannedDaily,
    averageDailyCentavos: averageDaily,
    projectedEndCentavos: projectedEnd,
    percentUsed: ratioPercent(spent, spendable),
    pace
  };
}

export interface CurrentCycle {
  cycle: Cycle;
  status: CycleStatus;
}

export function pickCurrentCycle(cycles: Cycle[], today: string): CurrentCycle | null {
  if (cycles.length === 0) return null;
  const sorted = [...cycles].sort((a, b) => compareDates(a.startDate, b.startDate));
  const active = sorted.filter((c) => cycleStatus(c, today) === 'active');
  if (active.length) return { cycle: active[active.length - 1], status: 'active' };
  const upcoming = sorted.find((c) => cycleStatus(c, today) === 'upcoming');
  const ended = [...sorted].reverse().find((c) => cycleStatus(c, today) === 'ended');
  if (ended && upcoming) {
    const gapToNext = diffDays(today, upcoming.startDate);
    const sinceEnd = diffDays(ended.endDate, today);
    return gapToNext <= sinceEnd ? { cycle: upcoming, status: 'upcoming' } : { cycle: ended, status: 'ended' };
  }
  if (upcoming) return { cycle: upcoming, status: 'upcoming' };
  return { cycle: ended!, status: 'ended' };
}

export function cyclesOverlap(a: Pick<Cycle, 'startDate' | 'endDate'>, b: Pick<Cycle, 'startDate' | 'endDate'>): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export function findOverlap(cycles: Cycle[], candidate: Pick<Cycle, 'id' | 'startDate' | 'endDate'>): Cycle | null {
  return cycles.find((c) => c.id !== candidate.id && cyclesOverlap(c, candidate)) ?? null;
}

export function cycleForDate(cycles: Cycle[], date: string): Cycle | null {
  return cycles.find((c) => date >= c.startDate && date <= c.endDate) ?? null;
}

export function carryoverFrom(previous: Cycle, txs: Transaction[]): Centavos {
  return Math.max(0, spendableCentavos(previous) - expensesInCycle(previous, txs));
}

export function nextAllowanceDate(frequency: Frequency, startDate: string): string | null {
  switch (frequency) {
    case 'weekly':
      return addDays(startDate, 7);
    case 'biweekly':
      return addDays(startDate, 14);
    case 'monthly':
      return addMonths(startDate, 1);
    default:
      return null;
  }
}

export function endDateFromNextAllowance(nextAllowance: string): string {
  return addDays(nextAllowance, -1);
}

export function nextAllowanceFromEnd(endDate: string): string {
  return addDays(endDate, 1);
}

export function suggestNextCycleStart(cycle: Cycle): string {
  return addDays(cycle.endDate, 1);
}
