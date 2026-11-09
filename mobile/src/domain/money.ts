export type Centavos = number;

export const MAX_CENTAVOS: Centavos = 999_999_999_999;

const PLAIN = /^(\d{1,10})(?:\.(\d{1,2}))?$/;
const GROUPED = /^(\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/;
const FRACTION_ONLY = /^\.(\d{1,2})$/;

export function parseMoney(input: string): Centavos | null {
  let text = input.trim().replace(/^(?:₱|php|p)\s*/i, '').replace(/\s+/g, '');
  if (text === '') return null;
  let whole: string;
  let frac = '';
  let m: RegExpMatchArray | null;
  if ((m = text.match(GROUPED))) {
    whole = m[1].replace(/,/g, '');
    frac = m[2] ?? '';
  } else if ((m = text.match(PLAIN))) {
    whole = m[1];
    frac = m[2] ?? '';
  } else if ((m = text.match(FRACTION_ONLY))) {
    whole = '0';
    frac = m[1];
  } else {
    return null;
  }
  const value = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(value) || value > MAX_CENTAVOS) return null;
  return value;
}

export function parseDecimalString(input: string | number): Centavos {
  const text = String(input).trim();
  const m = text.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  const digits = (m[3] ?? '').padEnd(3, '0');
  let cents = Number(m[2]) * 100 + Number(digits.slice(0, 2));
  if (Number(digits[2]) >= 5) cents += 1;
  return sign * cents;
}

export function formatMoney(value: Centavos, currency = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(value / 100);
}

export function formatMoneyCompact(value: Centavos, currency = 'PHP'): string {
  const whole = Math.abs(value) % 100 === 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value / 100);
}

export function toDecimalString(value: Centavos): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}

export function divFloor(value: Centavos, parts: number): Centavos {
  if (!Number.isInteger(parts) || parts <= 0) throw new RangeError('parts must be a positive integer');
  const remainder = ((value % parts) + parts) % parts;
  return (value - remainder) / parts;
}

export function divRoundHalfUp(value: Centavos, parts: number): Centavos {
  if (!Number.isInteger(parts) || parts <= 0) throw new RangeError('parts must be a positive integer');
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const quotient = divFloor(abs, parts);
  const remainder = abs - quotient * parts;
  return sign * (remainder * 2 >= parts ? quotient + 1 : quotient);
}

export function sumCentavos(values: Iterable<Centavos>): Centavos {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

export function ratioPercent(part: Centavos, whole: Centavos): number {
  if (whole <= 0) return part > 0 ? 100 : 0;
  return Math.round((part * 1000) / whole) / 10;
}

