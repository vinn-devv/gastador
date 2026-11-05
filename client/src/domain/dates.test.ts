import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  daysInclusive,
  diffDays,
  formatDayHeading,
  formatTime,
  fromManilaInput,
  isValidDate,
  legacyDateToManila,
  manilaDateOf,
  manilaToday,
  toManilaInput,
  weekStart
} from './dates';

describe('Asia/Manila date handling', () => {
  it('derives the Manila calendar date regardless of the device timezone', () => {
    expect(manilaDateOf('2026-10-31T15:59:59.000Z')).toBe('2026-10-31');
    expect(manilaDateOf('2026-10-31T16:00:00.000Z')).toBe('2026-11-01');
    expect(manilaToday(new Date('2026-12-31T16:30:00Z'))).toBe('2027-01-01');
  });

  it('round-trips date-time input values', () => {
    const iso = fromManilaInput('2026-11-01T00:05');
    expect(iso).toBe('2026-10-31T16:05:00.000Z');
    expect(toManilaInput(iso!)).toBe('2026-11-01T00:05');
    expect(manilaDateOf(iso!)).toBe('2026-11-01');
  });

  it('rejects impossible input values', () => {
    expect(fromManilaInput('2026-02-30T10:00')).toBeNull();
    expect(fromManilaInput('2026-02-10T24:00')).toBeNull();
    expect(fromManilaInput('garbage')).toBeNull();
  });

  it('formats times in Manila', () => {
    expect(formatTime('2026-10-31T04:30:00.000Z')).toBe('12:30 PM');
    expect(formatTime('2026-10-31T16:05:00.000Z')).toBe('12:05 AM');
  });
});

describe('calendar arithmetic', () => {
  it('validates real dates only', () => {
    expect(isValidDate('2024-02-29')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2026-1-1')).toBe(false);
  });

  it('adds days across month, year, and leap boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts inclusive days', () => {
    expect(daysInclusive('2026-10-31', '2026-11-13')).toBe(14);
    expect(daysInclusive('2026-11-01', '2026-11-01')).toBe(1);
    expect(daysInclusive('2024-02-28', '2024-03-01')).toBe(3);
    expect(diffDays('2026-11-01', '2026-11-08')).toBe(7);
  });

  it('adds months with end-of-month clamping', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
  });

  it('finds the Monday of a week', () => {
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
  });

  it('labels days', () => {
    expect(formatDayHeading('2026-11-01', '2026-11-01')).toBe('Today');
    expect(formatDayHeading('2026-10-31', '2026-11-01')).toBe('Yesterday');
    expect(formatDayHeading('2026-10-29', '2026-11-01')).toBe('Thursday, Oct 29');
  });
});

describe('legacy server dates', () => {
  it('reads plain dates and midnight-UTC timestamps as that calendar date', () => {
    expect(legacyDateToManila('2026-10-25')).toBe('2026-10-25');
    expect(legacyDateToManila('2026-10-25T00:00:00.000Z')).toBe('2026-10-25');
  });

  it('reads timestamps from a Manila-timezone server as the intended date', () => {
    expect(legacyDateToManila('2026-10-24T16:00:00.000Z')).toBe('2026-10-25');
  });

  it('rejects garbage', () => {
    expect(legacyDateToManila('not a date')).toBeNull();
    expect(legacyDateToManila('2026-02-30')).toBeNull();
  });
});
