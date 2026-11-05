import { toDecimalString } from './money';
import { toManilaInput } from './dates';
import { methodLabel, type Category, type Transaction } from './types';

const COLUMNS = ['date', 'time', 'merchant', 'amount_php', 'category', 'payment_method', 'notes', 'source', 'splurge_tag', 'reference'] as const;

export function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function transactionsToCsv(txs: Transaction[], categories: Category[]): string {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const rows = [...txs]
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .map((t) => {
      const local = toManilaInput(t.occurredAt);
      return [
        local.slice(0, 10),
        local.slice(11),
        t.merchant,
        toDecimalString(t.amountCentavos),
        names.get(t.categoryId) ?? 'Unknown',
        methodLabel(t.paymentMethod),
        t.description ?? '',
        t.source,
        t.isSplurge ? 'yes' : 'no',
        t.externalReference ?? ''
      ]
        .map(csvCell)
        .join(',');
    });
  return `\uFEFF${[COLUMNS.join(','), ...rows].join('\r\n')}`;
}
