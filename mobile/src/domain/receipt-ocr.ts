import { parseMoney, toDecimalString } from "./money";

export interface ReceiptExtraction {
  amount: string | null;
  merchant: string | null;
  date: string | null;
  rawText: string;
}

function parseReceiptDate(text: string): string | null {
  const iso = text.match(/\\b(20\\d{2})[-/.](\\d{1,2})[-/.](\\d{1,2})\\b/);
  if (iso) {
    const [, year, month, day] = iso;
    const value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidIsoDate(value) ? value : null;
  }
  const numeric = text.match(/\\b(\\d{1,2})[/-](\\d{1,2})[/-](20\\d{2})\\b/);
  if (numeric) {
    const [, day, month, year] = numeric;
    const value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidIsoDate(value) ? value : null;
  }
  const named = text.match(/\\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+(\\d{1,2}),?\\s+(20\\d{2})\\b/i);
  if (named) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = months.indexOf(named[1].slice(0, 3).toLowerCase()) + 1;
    const value = `${named[3]}-${String(month).padStart(2, "0")}-${named[2].padStart(2, "0")}`;
    return isValidIsoDate(value) ? value : null;
  }
  return null;
}

function isValidIsoDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeAmount(value: string): string | null {
  const cleaned = value.replace(/[^0-9.,]/g, "").replace(/,(?=\\d{2}$)/, ".");
  const candidates = cleaned.match(/\\d[\\d,]*(?:\\.\\d{1,2})?/g) ?? [];
  for (const candidate of candidates.reverse()) {
    const normalized = candidate.includes(".") ? candidate.replace(/,/g, "") : candidate.replace(/,/g, "");
    const cents = parseMoney(normalized);
    if (cents !== null && cents > 0) return toDecimalString(cents);
  }
  return null;
}

export function parseReceiptText(rawText: string): ReceiptExtraction {
  const lines = rawText.split(/\\r?\\n/).map((line) => line.replace(/\\s+/g, " ").trim()).filter(Boolean);
  const totalLabels = /\\b(grand\\s+total|total\\s+due|amount\\s+due|balance\\s+due|net\\s+amount|total)\\b/i;
  const excludedLabels = /\\b(subtotal|tax|vat|change|cash|tender|discount|savings|item|qty|quantity|price|receipt|invoice|cashier|terminal|thank you)\\b/i;
  let amount: string | null = null;
  const totalLines = lines.filter((line) => totalLabels.test(line) && !/\\b(subtotal|tax|vat|change|cash|tender|discount)\\b/i.test(line));
  for (const line of [...totalLines].reverse()) {
    const parsed = normalizeAmount(line);
    if (parsed) { amount = parsed; break; }
  }
  if (!amount) {
    const candidates = lines
      .filter((line) => !excludedLabels.test(line))
      .map((line) => normalizeAmount(line))
      .filter((value): value is string => value !== null)
      .map((value) => ({ value, cents: parseMoney(value) ?? 0 }))
      .sort((a, b) => b.cents - a.cents);
    amount = candidates[0]?.value ?? null;
  }

  const merchant = lines.find((line, index) =>
    index < 5 &&
    line.length >= 2 &&
    line.length <= 48 &&
    !/\\d{3,}/.test(line) &&
    !/\\b(receipt|invoice|official receipt|vat reg|tin|cashier|terminal|date|time|store no)\\b/i.test(line)
  ) ?? null;

  return { amount, merchant, date: parseReceiptDate(rawText), rawText };
}
