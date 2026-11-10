import { toDecimalString } from "./money";
import { methodLabel, type Category, type Cycle, type Transaction } from "./types";

export type CsvDateRange = {
  from: string | null;
  to: string | null;
};

export type CsvExportOptions = {
  dateRange?: CsvDateRange;
  categoryIds?: string[];
  includeNotes?: boolean;
};

export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  const isNumeric =
    typeof value === "number" ||
    (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value));
  if (!isNumeric && /^[\t\r ]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function filterTransactionsForCsv(
  transactions: Transaction[],
  options: CsvExportOptions = {},
): Transaction[] {
  const selected = options.categoryIds ? new Set(options.categoryIds) : null;
  const { from, to } = options.dateRange ?? { from: null, to: null };

  return transactions
    .filter((transaction) => !from || transaction.date >= from)
    .filter((transaction) => !to || transaction.date <= to)
    .filter((transaction) => !selected || selected.has(transaction.categoryId))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.occurredAt < b.occurredAt ? 1 : -1;
    });
}

export function transactionsToCsv(
  transactions: Transaction[],
  categories: Category[],
  cycles: Cycle[] = [],
  options: CsvExportOptions = {},
): string {
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const sorted = filterTransactionsForCsv(transactions, options);
  const columns = ["date", "amount", "category", "note", "payment_method", "cycle"];

  const rows = sorted.map((transaction) => {
    const cycle = cycles.find(
      (item) => transaction.date >= item.startDate && transaction.date <= item.endDate,
    );
    return [
      transaction.date,
      toDecimalString(transaction.amountCentavos),
      categoryNames.get(transaction.categoryId) ?? "Unknown",
      options.includeNotes === false ? "" : transaction.description ?? "",
      methodLabel(transaction.paymentMethod),
      cycle?.name ?? "",
    ].map(csvCell).join(",");
  });

  return "\uFEFF" + [columns.map(csvCell).join(","), ...rows].join("\r\n");
}
