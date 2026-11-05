import { describe, expect, it } from 'vitest';
import { divFloor, divRoundHalfUp, formatMoney, parseDecimalString, parseMoney, ratioPercent, sumCentavos, toDecimalString } from './money';

describe('parseMoney', () => {
  it('parses plain and decimal amounts into integer centavos', () => {
    expect(parseMoney('125')).toBe(12500);
    expect(parseMoney('125.4')).toBe(12540);
    expect(parseMoney('125.40')).toBe(12540);
    expect(parseMoney('0.01')).toBe(1);
    expect(parseMoney('.5')).toBe(50);
  });

  it('avoids floating point drift on classic problem values', () => {
    expect(parseMoney('0.1')! + parseMoney('0.2')!).toBe(30);
    expect(parseMoney('1.005')).toBeNull();
    expect(parseMoney('19.99')! * 3).toBe(5997);
    expect(parseMoney('4.35')).toBe(435);
    expect(parseMoney('1.15')).toBe(115);
  });

  it('accepts thousands separators and currency prefixes', () => {
    expect(parseMoney('1,234.50')).toBe(123450);
    expect(parseMoney('₱ 2,000')).toBe(200000);
    expect(parseMoney('PHP 99')).toBe(9900);
  });

  it('rejects malformed, negative, and oversized input', () => {
    for (const bad of ['', ' ', 'abc', '-5', '1,23,456', '12.345', '1..2', '12,34', '99999999999.00']) {
      expect(parseMoney(bad), bad).toBeNull();
    }
  });
});

describe('parseDecimalString', () => {
  it('converts server numeric strings exactly', () => {
    expect(parseDecimalString('2000.50')).toBe(200050);
    expect(parseDecimalString('250.75')).toBe(25075);
    expect(parseDecimalString('0.00')).toBe(0);
    expect(parseDecimalString(125.4)).toBe(12540);
  });

  it('rounds extra decimals half up and ignores garbage', () => {
    expect(parseDecimalString('10.005')).toBe(1001);
    expect(parseDecimalString('10.004')).toBe(1000);
    expect(parseDecimalString('nope')).toBe(0);
  });
});

describe('formatting', () => {
  it('formats pesos with two decimals', () => {
    expect(formatMoney(12540)).toBe('₱125.40');
    expect(formatMoney(-50000)).toBe('-₱500.00');
    expect(formatMoney(123456789)).toBe('₱1,234,567.89');
    expect(toDecimalString(5)).toBe('0.05');
    expect(toDecimalString(-12345)).toBe('-123.45');
  });
});

describe('integer division', () => {
  it('floors without exceeding the total', () => {
    expect(divFloor(10000, 3)).toBe(3333);
    expect(divFloor(10000, 3) * 3).toBeLessThanOrEqual(10000);
    expect(divFloor(0, 5)).toBe(0);
    expect(divFloor(99, 100)).toBe(0);
  });

  it('rounds half up for averages', () => {
    expect(divRoundHalfUp(5, 2)).toBe(3);
    expect(divRoundHalfUp(4, 3)).toBe(1);
    expect(divRoundHalfUp(5, 3)).toBe(2);
    expect(divRoundHalfUp(-5, 2)).toBe(-3);
  });

  it('rejects invalid divisors', () => {
    expect(() => divFloor(100, 0)).toThrow();
    expect(() => divRoundHalfUp(100, -1)).toThrow();
  });

  it('sums and computes percentages', () => {
    expect(sumCentavos([10, 20, 30])).toBe(60);
    expect(ratioPercent(250, 1000)).toBe(25);
    expect(ratioPercent(1, 3)).toBe(33.3);
    expect(ratioPercent(500, 0)).toBe(100);
    expect(ratioPercent(0, 0)).toBe(0);
  });
});
