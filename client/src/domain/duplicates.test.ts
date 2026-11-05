import { describe, expect, it } from 'vitest';
import { transactionsToCsv, csvCell } from './csv';
import { findDuplicate } from './duplicates';
import type { Category, Transaction } from './types';

const base: Transaction = {
  id: 't1',
  amountCentavos: 12540,
  occurredAt: '2026-10-31T04:30:00.000Z',
  date: '2026-10-31',
  merchant: 'Jollibee Katipunan',
  categoryId: 'c1',
  paymentMethod: 'gcash',
  description: null,
  source: 'manual',
  ocrStatus: 'not_applicable',
  externalReference: '1234 567 890 123',
  isSplurge: false,
  receiptHashes: [],
  createdAt: '2026-10-31T04:30:00.000Z',
  updatedAt: '2026-10-31T04:30:00.000Z'
};

describe('duplicate detection', () => {
  it('matches the same payment reference regardless of spacing', () => {
    const hit = findDuplicate([base], { amountCentavos: 1, merchant: 'x', date: '2026-01-01', paymentMethod: 'gcash', externalReference: '1234567890123' });
    expect(hit?.kind).toBe('reference');
  });

  it('does not match a reference from a different payment method', () => {
    expect(findDuplicate([base], { amountCentavos: 1, merchant: 'x', date: '2026-01-01', paymentMethod: 'maya', externalReference: '1234567890123' })).toBeNull();
  });

  it('flags likely duplicates on amount, day, and similar merchant', () => {
    const hit = findDuplicate([base], { amountCentavos: 12540, merchant: 'JOLLIBEE', date: '2026-10-31', paymentMethod: 'cash', externalReference: null });
    expect(hit?.kind).toBe('likely');
  });

  it('ignores different amounts, days, or unrelated merchants', () => {
    const c = { amountCentavos: 12540, merchant: 'Jollibee', date: '2026-10-31', paymentMethod: 'cash' as const, externalReference: null };
    expect(findDuplicate([base], { ...c, amountCentavos: 12541 })).toBeNull();
    expect(findDuplicate([base], { ...c, date: '2026-11-01' })).toBeNull();
    expect(findDuplicate([base], { ...c, merchant: 'Mercury Drug' })).toBeNull();
  });

  it('does not match the transaction being edited', () => {
    expect(findDuplicate([base], { amountCentavos: 12540, merchant: 'Jollibee', date: '2026-10-31', paymentMethod: 'gcash', externalReference: null }, 't1')).toBeNull();
  });
});

describe('CSV export', () => {
  const cats: Category[] = [{ id: 'c1', name: 'Food', sortOrder: 0, archivedAt: null, createdAt: '' }];

  it('writes decimal pesos from integer centavos with a header and BOM', () => {
    const csv = transactionsToCsv([base], cats);
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(lines[0]).toBe('date,time,merchant,amount_php,category,payment_method,notes,source,splurge_tag,reference');
    expect(lines[1]).toBe('"2026-10-31","12:30","Jollibee Katipunan","125.40","Food","GCash","","manual","no","1234 567 890 123"');
  });

  it('neutralises spreadsheet formulas and escapes quotes', () => {
    expect(csvCell('=SUM(A1)')).toBe(`"'=SUM(A1)"`);
    expect(csvCell('+1')).toBe(`"'+1"`);
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('safe-text')).toBe('"safe-text"');
  });
});
