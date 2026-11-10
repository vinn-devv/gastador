import { isValidDate, legacyDateToManila } from "./dates";

export type DateRange = { startDate: string; endDate: string };

export function rangesOverlapInclusive(a: DateRange, b: DateRange): boolean {
  if (!isValidDate(a.startDate) || !isValidDate(a.endDate) ||
      !isValidDate(b.startDate) || !isValidDate(b.endDate)) {
    throw new RangeError("Cycle dates must be normalized YYYY-MM-DD calendar dates.");
  }
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export function cycleContainsDate(cycle: DateRange, date: string): boolean {
  if (!isValidDate(date) || !isValidDate(cycle.startDate) || !isValidDate(cycle.endDate)) {
    throw new RangeError("Cycle dates must be normalized YYYY-MM-DD calendar dates.");
  }
  return cycle.startDate <= date && date <= cycle.endDate;
}

export type LegacyDateConversion =
  | { ok: true; date: string; changed: boolean }
  | { ok: false; date: null; changed: false };

export function convertLegacyCycleDate(value: string): LegacyDateConversion {
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
    return isValidDate(value)
      ? { ok: true, date: value, changed: false }
      : { ok: false, date: null, changed: false };
  }
  const date = legacyDateToManila(value);
  return date
    ? { ok: true, date, changed: true }
    : { ok: false, date: null, changed: false };
}
