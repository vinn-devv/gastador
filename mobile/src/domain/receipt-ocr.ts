import { parseMoney, toDecimalString } from "./money";

export interface ReceiptExtraction {
  amount: string | null;
  merchant: string | null;
  description: string | null;
  date: string | null;
  rawText: string;
}

const IGNORE_LINE = /\b(tax|vat|change|cash|tender|discount|savings|qty|quantity|price|receipt|invoice|cashier|manager|terminal|thank you|tel\.?|phone|city index|zip|barcode|mediamodifier|modif\.ai)\b/i;
const DESCRIPTION_IGNORE_LINE = /\b(sub\s?total|subtotal|grand\s*total|total\s*due|amount\s*due|balance\s*due|net\s*amount|tax|vat|change|cash|tender|discount|savings|qty|quantity|price|receipt|invoice|cashier|manager|terminal|thank you|tel\.?|phone|city index|zip|barcode|mediamodifier|modif\.ai)\b/i;
const MONEY_TOKEN = /(?:[$₱€£]\s*)?\d{1,3}(?:,\d{3})*\.\d{2}\b/g;

function moneyTokens(line: string): string[] {
  return (line.match(MONEY_TOKEN) ?? [])
    .map((token) => token.replace(/[^0-9.,]/g, "").replace(/,/g, ""))
    .filter((token) => {
      const cents = parseMoney(token);
      return cents !== null && cents > 0;
    });
}

function parseAmount(lines: string[]): string | null {
  const priorityLabels = [
    /\b(grand\s*total|total\s*due|amount\s*due|balance\s*due|net\s*amount)\b/i,
    /\b(sub\s?total|subtotal)\b/i,
    /\btotal\b/i,
  ];

  for (const label of priorityLabels) {
    const matching = lines.filter((line) =>
      label.test(line) && !/\b(change|cash|tender|tax|vat|discount)\b/i.test(line),
    );
    for (const line of matching.reverse()) {
      const lineIndex = lines.indexOf(line);
      const tokens = [
        ...moneyTokens(line),
        ...(lineIndex >= 0 && lines[lineIndex + 1] ? moneyTokens(lines[lineIndex + 1]) : []),
      ];
      const token = tokens[tokens.length - 1];
      if (token) {
        const cents = parseMoney(token);
        if (cents !== null && cents > 0) return toDecimalString(cents);
      }
    }
  }

  // If no explicit receipt total is visible, do not guess from item prices or IDs.
  return null;
}

function parseReceiptDate(text: string): string | null {
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) {
    const [, year, month, day] = iso;
    const value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidIsoDate(value) ? value : null;
  }
  const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
  if (numeric) {
    const [, day, month, year] = numeric;
    const value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return isValidIsoDate(value) ? value : null;
  }
  const named = text.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(20\d{2})\b/i);
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

function parseMerchant(lines: string[]): string | null {
  const ignored = /\b(supermarket|receipt|invoice|official receipt|vat reg|tin|cashier|manager|terminal|date|time|store no|tel\.?|phone|city index|thank you|mediamodifier|modif\.ai)\b/i;
  const candidate = lines.slice(0, 8).find((line) =>
    line.length >= 3 &&
    line.length <= 48 &&
    !/\d/.test(line) &&
    !ignored.test(line) &&
    /[a-z]{3}/i.test(line),
  );
  // Generic receipt headings and watermark text are not merchant names.
  return candidate && !/^supermarket$/i.test(candidate) ? candidate : null;
}

function parseDescription(lines: string[]): string | null {
  const items = lines
    .filter((line) => {
      MONEY_TOKEN.lastIndex = 0;
      return MONEY_TOKEN.test(line) && !DESCRIPTION_IGNORE_LINE.test(line);
    })
    .map((line) => {
      MONEY_TOKEN.lastIndex = 0;
      return line.replace(MONEY_TOKEN, "").replace(/\s+/g, " ").trim();
    })
    .filter((line) => line.length >= 3 && !/^\d+$/.test(line) && !/mediamodifier|modif\.ai/i.test(line));
  return items.length ? [...new Set(items)].slice(0, 5).join(", ") : null;
}

export function parseReceiptText(rawText: string): ReceiptExtraction {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return {
    amount: parseAmount(lines),
    merchant: parseMerchant(lines),
    description: parseDescription(lines),
    date: parseReceiptDate(rawText),
    rawText,
  };
}
