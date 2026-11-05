import { suggestCategoryKey, type CategoryDef } from '../domain/categories';
import { isValidDate, manilaToday, addDays } from '../domain/dates';
import { parseMoney } from '../domain/money';
import type { PaymentMethod } from '../domain/types';

export type Confidence = 'high' | 'medium' | 'low';

export interface ParsedField<T> {
  value: T;
  confidence: Confidence;
}

export interface ParsedReceipt {
  amountCentavos: ParsedField<number> | null;
  merchant: ParsedField<string> | null;
  occurredAtInput: ParsedField<string> | null;
  reference: ParsedField<string> | null;
  method: ParsedField<PaymentMethod> | null;
  categoryKey: CategoryDef['key'] | null;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const CURRENCY = '(?:₱|PHP|Php|php|P|R|#|F)?';
const AMOUNT = new RegExp(`${CURRENCY}\\s*((?:\\d{1,3}(?:,\\d{3})+|\\d+)\\.\\d{2})(?!\\d)`, 'g');
const STRONG_LABEL = /total amount|amount paid|amount due|total due|amount sent|you paid|you sent|total payment|grand total|amount to pay/i;
const WEAK_LABEL = /\bamount\b|\btotal\b|\bpaid\b|\bsent\b|\bpayment\b/i;
const SKIP_LINE = /\bfee\b|change|cash tendered|\btender|balance|\bvat\b|\btax\b|discount|subtotal|\bpoints?\b|cashback/i;
const pad = (n: number) => String(n).padStart(2, '0');

function amountsIn(line: string): number[] {
  const out: number[] = [];
  for (const m of line.matchAll(AMOUNT)) {
    const cents = parseMoney(m[1]);
    if (cents !== null && cents > 0) out.push(cents);
  }
  return out;
}

function findAmount(lines: string[]): ParsedField<number> | null {
  for (const l of lines) {
    if (STRONG_LABEL.test(l) && !SKIP_LINE.test(l)) {
      const a = amountsIn(l);
      if (a.length) return { value: a[a.length - 1], confidence: 'high' };
    }
  }
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^(total )?amount( paid| sent)?:?$/i.test(lines[i]) || STRONG_LABEL.test(lines[i])) {
      const a = amountsIn(lines[i + 1]);
      if (a.length) return { value: a[0], confidence: 'high' };
    }
  }
  for (const l of lines) {
    if (WEAK_LABEL.test(l) && !SKIP_LINE.test(l)) {
      const a = amountsIn(l);
      if (a.length) return { value: a[a.length - 1], confidence: 'medium' };
    }
  }
  const symbol = lines.find((l) => /(?:₱|PHP|Php)\s*\d/.test(l) && !SKIP_LINE.test(l));
  if (symbol) {
    const a = amountsIn(symbol.replace(/(?:₱|PHP|Php)\s*(\d[\d,]*)(?!\.\d)/, '$1.00'));
    if (a.length) return { value: a[0], confidence: 'low' };
  }
  const all = lines.filter((l) => !SKIP_LINE.test(l)).flatMap(amountsIn);
  if (all.length) return { value: Math.max(...all), confidence: 'low' };
  return null;
}

function buildDate(y: number, mo: number, d: number, h?: string, mi?: string, ap?: string): ParsedField<string> | null {
  const date = `${y}-${pad(mo)}-${pad(d)}`;
  if (y < 2015 || !isValidDate(date)) return null;
  let hour = h ? Number(h) : 12;
  if (ap) {
    const pm = ap.toLowerCase().startsWith('p');
    if (pm && hour < 12) hour += 12;
    if (!pm && hour === 12) hour = 0;
  }
  if (hour > 23) return null;
  const hasTime = Boolean(h && mi);
  const future = date > addDays(manilaToday(), 1);
  return { value: `${date}T${pad(hour)}:${mi ?? '00'}`, confidence: future ? 'low' : hasTime ? 'high' : 'medium' };
}

function findDate(text: string): ParsedField<string> | null {
  const normalized = text.replace(/\b0ct\b/gi, 'Oct').replace(/\bSept\b/gi, 'Sep');
  let m = normalized.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})(?:[,\s]+(?:at\s+)?(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp]\.?[Mm])?)?/);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) {
    const r = buildDate(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2], m[4], m[5], m[6]?.replace('.', ''));
    if (r) return r;
  }
  m = normalized.match(/(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?)?/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) {
    const r = buildDate(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1], m[4], m[5], m[6]);
    if (r) return r;
  }
  m = normalized.match(/(\d{4})-(\d{2})-(\d{2})(?:[T\s]+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const r = buildDate(+m[1], +m[2], +m[3], m[4], m[5]);
    if (r) return r;
  }
  m = normalized.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[,\s]+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?)?/);
  if (m) {
    const year = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    const r = buildDate(year, +m[1], +m[2], m[4], m[5], m[6]);
    if (r) return r;
  }
  return null;
}

const NOT_MERCHANT = /receipt|official|invoice|\btin\b|vat|date|time|\bref|thank|gcash|maya|payment|successful|total|amount|express send|send money|transaction|sent via|available balance|\bpaid\b|you paid|pay bills/i;

function findMerchant(lines: string[]): ParsedField<string> | null {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(?:paid to|sent to|send to|to|merchant|store|recipient|bill to|payee|biller)\b\s*:?\s*(.*)$/i);
    if (m) {
      const value = (m[1].trim() || lines[i + 1]?.trim() || '').replace(/[^\p{L}\p{N}&'.,\- ]/gu, '').trim();
      if (value && /[A-Za-z]{3}/.test(value)) return { value: value.slice(0, 120), confidence: 'high' };
    }
  }
  for (const l of lines.slice(0, 8)) {
    const letters = (l.match(/[A-Za-z]/g) ?? []).length;
    if (letters >= 4 && letters / l.length > 0.6 && !NOT_MERCHANT.test(l)) return { value: l.slice(0, 120), confidence: 'low' };
  }
  return null;
}

function findMethod(text: string): ParsedField<PaymentMethod> | null {
  if (/g-?cash/i.test(text)) return { value: 'gcash', confidence: 'high' };
  if (/pay ?maya|\bmaya\b/i.test(text)) return { value: 'maya', confidence: 'high' };
  if (/express send|gcash pay|bank transfer via/i.test(text)) return { value: 'gcash', confidence: 'medium' };
  return null;
}

function findReference(text: string): ParsedField<string> | null {
  const m = text.match(/ref(?:erence)?\.?\s*(?:no\.?|number|#)?\s*:?\s*([0-9][0-9 ]{7,19}[0-9])/i);
  if (!m) return null;
  const digits = m[1].replace(/\s/g, '');
  return { value: digits, confidence: digits.length >= 10 ? 'high' : 'medium' };
}

export function parseText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const merchant = findMerchant(lines);
  return {
    amountCentavos: findAmount(lines),
    merchant,
    occurredAtInput: findDate(text),
    reference: findReference(text),
    method: findMethod(text),
    categoryKey: suggestCategoryKey(`${merchant?.value ?? ''} ${text}`) ?? null
  };
}

export type ReadingQuality = 'good' | 'fair' | 'poor';

export function readingQuality(engineConfidence: number, parsed: ParsedReceipt): ReadingQuality {
  if (!parsed.amountCentavos) return 'poor';
  if (engineConfidence >= 80 && parsed.amountCentavos.confidence === 'high') return 'good';
  if (engineConfidence >= 55) return 'fair';
  return 'poor';
}
