import { describe, expect, it } from 'vitest';
import { parseText, readingQuality } from './parse';

describe('GCash screenshots', () => {
  const text = `Express Send
Sent to
JUAN D.
Amount 100.00
Total Amount Sent ₱ 100.00
Ref No. 1234 567 890 123
Oct 31, 2026 12:30 PM`;

  it('reads the labelled total, recipient, date, reference, and provider', () => {
    const r = parseText(text);
    expect(r.amountCentavos).toEqual({ value: 10000, confidence: 'high' });
    expect(r.merchant?.value).toBe('JUAN D.');
    expect(r.occurredAtInput).toEqual({ value: '2026-10-31T12:30', confidence: 'high' });
    expect(r.reference).toEqual({ value: '1234567890123', confidence: 'high' });
    expect(r.method).toEqual({ value: 'gcash', confidence: 'medium' });
  });

  it('ignores fee and balance lines when choosing the amount', () => {
    const r = parseText('GCash\nPaid to Mercury Drug\nService Fee 5.00\nAvailable Balance 1,250.00\nTotal Amount ₱ 245.50\nNov 1, 2026 9:05 AM');
    expect(r.amountCentavos?.value).toBe(24550);
    expect(r.merchant?.value).toBe('Mercury Drug');
    expect(r.categoryKey).toBe('personal');
  });

  it('reads an amount placed on the line after its label', () => {
    const r = parseText('Total Amount\n₱1,250.75\nPaid to Starbucks');
    expect(r.amountCentavos).toEqual({ value: 125075, confidence: 'high' });
    expect(r.categoryKey).toBe('food');
  });
});

describe('Maya screenshots', () => {
  it('detects Maya and a 12-hour time', () => {
    const r = parseText('Maya\nPayment successful\nYou paid ₱350.00\nMerchant\nNational Book Store\nNov 2, 2026, 3:15 PM');
    expect(r.method?.value).toBe('maya');
    expect(r.amountCentavos?.value).toBe(35000);
    expect(r.merchant?.value).toBe('National Book Store');
    expect(r.occurredAtInput?.value).toBe('2026-11-02T15:15');
    expect(r.categoryKey).toBe('school');
  });
});

describe('paper receipts', () => {
  const receipt = `7-ELEVEN CONVENIENCE
Katipunan Ave
Item A      35.00
Item B      60.00
VAT          10.18
TOTAL       95.00
CASH       100.00
CHANGE       5.00
11/02/2026 18:45`;

  it('uses the TOTAL line and not cash or change', () => {
    const r = parseText(receipt);
    expect(r.amountCentavos?.value).toBe(9500);
    expect(r.merchant?.value).toBe('7-ELEVEN CONVENIENCE');
    expect(r.merchant?.confidence).toBe('low');
    expect(r.occurredAtInput?.value).toBe('2026-11-02T18:45');
    expect(r.method).toBeNull();
    expect(r.categoryKey).toBe('food');
  });

  it('marks unlabelled amounts as low confidence', () => {
    const r = parseText('Some Shop\n45.50\nthank you');
    expect(r.amountCentavos).toEqual({ value: 4550, confidence: 'low' });
  });
});

describe('noisy and missing data', () => {
  it('returns nothing rather than guessing from empty text', () => {
    const r = parseText('');
    expect(r.amountCentavos).toBeNull();
    expect(r.merchant).toBeNull();
    expect(r.occurredAtInput).toBeNull();
    expect(r.method).toBeNull();
  });

  it('accepts OCR confusions in month names and rejects impossible dates', () => {
    expect(parseText('0ct 31, 2026 10:00 AM').occurredAtInput?.value).toBe('2026-10-31T10:00');
    expect(parseText('Feb 30, 2026 10:00 AM').occurredAtInput).toBeNull();
    expect(parseText('Jan 5, 1999').occurredAtInput).toBeNull();
  });

  it('lowers confidence for far-future dates', () => {
    expect(parseText('Jan 5, 2099 10:00 AM').occurredAtInput?.confidence).toBe('low');
  });

  it('never claims certainty from weak reading', () => {
    const parsed = parseText('Shop\n45.50');
    expect(readingQuality(90, parsed)).toBe('fair');
    expect(readingQuality(30, parsed)).toBe('poor');
    expect(readingQuality(95, parseText('nothing here'))).toBe('poor');
    expect(readingQuality(92, parseText('Total Amount ₱10.00'))).toBe('good');
  });
});
