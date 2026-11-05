import { beforeEach, describe, expect, it } from 'vitest';
import legacyFixture from '../test/fixtures/legacy-export.json';
import { summarizeCycle } from '../domain/allowance';
import { BackupError, createBackup, parseBackup, restoreBackup } from './backup';
import { resetDatabaseForTests } from './db';
import { convertLegacyExport, importLegacyExport, isLegacyExport } from './legacy';
import { addGoal, addContribution, addTransaction, createCycle, ensureReady, getReceiptBlob, loadWorld, resetReadyForTests, saveReceipt, wipeAllData } from './repo';

async function reset() {
  await resetDatabaseForTests();
  resetReadyForTests();
  await ensureReady();
}

async function seedSample() {
  const w = await loadWorld();
  const cycle = await createCycle({ name: 'Nov A', frequency: 'biweekly', startDate: '2026-11-01', endDate: '2026-11-14', allowanceCentavos: 200050, plannedSavingsCentavos: 10000 });
  const hash = await saveReceipt(new Blob([new Uint8Array([9, 8, 7])], { type: 'image/png' }));
  await addTransaction({ amountCentavos: 12540, occurredAt: '2026-11-02T04:00:00.000Z', merchant: 'Jollibee', categoryId: w.categories[0].id, paymentMethod: 'gcash', isSplurge: true, receiptHashes: [hash], externalReference: '1234567890123', source: 'screenshot' });
  const goal = await addGoal({ name: 'Laptop', targetCentavos: 500000, targetDate: '2027-03-01' });
  await addContribution(goal.id, 25075);
  return cycle;
}

beforeEach(reset);

describe('backup round trip', () => {
  it('exports a versioned file and restores it exactly into an empty device', async () => {
    await seedSample();
    const before = await loadWorld();
    const file = await createBackup({ includeReceipts: true });
    expect(file.formatVersion).toBe(1);
    expect(file.app).toBe('gastador');
    expect(file.receipts).toHaveLength(1);
    const text = JSON.stringify(file);
    expect(text).not.toContain('entitlement');

    await wipeAllData();
    expect((await loadWorld()).transactions).toHaveLength(0);

    const report = await restoreBackup(parseBackup(text), 'replace');
    expect(report.transactions).toBe(1);
    const after = await loadWorld();
    expect(after.transactions).toEqual(before.transactions);
    expect(after.cycles).toEqual(before.cycles);
    expect(after.categories).toEqual(before.categories);
    expect(after.goals).toEqual(before.goals);
    expect(after.contributions).toEqual(before.contributions);
    expect((await getReceiptBlob(before.transactions[0].receiptHashes[0]))?.size).toBe(3);
  });

  it('omits receipt images unless asked', async () => {
    await seedSample();
    expect((await createBackup({ includeReceipts: false })).receipts).toBeUndefined();
  });

  it('replace restores atomically: a bad file changes nothing', async () => {
    await seedSample();
    const before = await loadWorld();
    const file = await createBackup({ includeReceipts: false });
    file.data.transactions[0].categoryId = 'missing-category';
    expect(() => parseBackup(JSON.stringify(file))).toThrow(BackupError);
    expect((await loadWorld()).transactions).toEqual(before.transactions);
  });

  it('merge adds only new records and never duplicates', async () => {
    await seedSample();
    const file = await createBackup({ includeReceipts: false });
    const first = await restoreBackup(file, 'merge');
    expect(first.transactions).toBe(0);
    expect(first.skipped.length).toBeGreaterThan(0);
    const w = await loadWorld();
    expect(w.transactions).toHaveLength(1);
    expect(w.cycles).toHaveLength(1);
    expect(w.contributions).toHaveLength(1);
  });

  it('merge skips cycles that overlap existing ones and remaps categories by name', async () => {
    await seedSample();
    const file = await createBackup({ includeReceipts: false });
    await wipeAllData();
    await createCycle({ name: 'Local', frequency: 'custom', startDate: '2026-11-10', endDate: '2026-11-20', allowanceCentavos: 1000, plannedSavingsCentavos: 0 });
    const report = await restoreBackup(file, 'merge');
    expect(report.cycles).toBe(0);
    expect(report.skipped.join(' ')).toContain('overlaps');
    const w = await loadWorld();
    expect(w.categories).toHaveLength(6);
    const tx = w.transactions[0];
    expect(w.categories.some((c) => c.id === tx.categoryId)).toBe(true);
  });
});

describe('backup validation', () => {
  const valid = async () => JSON.parse(JSON.stringify(await createBackup({ includeReceipts: false })));

  it('rejects non-JSON and foreign files', () => {
    expect(() => parseBackup('{oops')).toThrow(/not valid JSON/);
    expect(() => parseBackup('{"hello":1}')).toThrow(/not a Gastador backup/);
    expect(() => parseBackup('[]')).toThrow(/not a Gastador backup/);
  });

  it('rejects newer format versions with a helpful message', async () => {
    const f = await valid();
    f.formatVersion = 99;
    expect(() => parseBackup(f)).toThrow(/newer version/);
  });

  it('rejects fractional centavos, bad dates, and overlapping cycles', async () => {
    await seedSample();
    const f = await valid();
    const frac = JSON.parse(JSON.stringify(f));
    frac.data.transactions[0].amountCentavos = 12.5;
    expect(() => parseBackup(frac)).toThrow(BackupError);
    const badDate = JSON.parse(JSON.stringify(f));
    badDate.data.cycles[0].startDate = '2026-02-30';
    expect(() => parseBackup(badDate)).toThrow(BackupError);
    const overlap = JSON.parse(JSON.stringify(f));
    overlap.data.cycles.push({ ...overlap.data.cycles[0], id: 'other', name: 'Other' });
    expect(() => parseBackup(overlap)).toThrow(/overlap/);
  });
});

describe('migration from the old online account', () => {
  it('recognises the legacy export shape', () => {
    expect(isLegacyExport(legacyFixture)).toBe(true);
    expect(isLegacyExport({ app: 'gastador' })).toBe(false);
    expect(isLegacyExport(null)).toBe(false);
  });

  it('converts a real server export into exact integer centavos', () => {
    const { data, report } = convertLegacyExport(legacyFixture);
    expect(report.counts).toMatchObject({ cycles: 1, transactions: 2, goals: 1, contributions: 1 });
    expect(data.categories.some((c) => /saving/i.test(c.name))).toBe(false);
    expect(report.warnings.join(' ')).toContain('Savings');
    const cycle = data.cycles[0];
    expect(cycle.startDate).toBe('2026-10-25');
    expect(cycle.endDate).toBe('2026-11-07');
    expect(cycle.allowanceCentavos).toBe(200050);
    expect(cycle.plannedSavingsCentavos).toBe(10000);
    const jollibee = data.transactions.find((t) => t.merchant === 'Jollibee')!;
    expect(jollibee.amountCentavos).toBe(12540);
    expect(jollibee.date).toBe('2026-10-31');
    expect(jollibee.isSplurge).toBe(true);
    expect(jollibee.externalReference).toBe('1234567890123');
    const jeep = data.transactions.find((t) => t.merchant === 'Jeep')!;
    expect(jeep.date).toBe('2026-10-31');
    expect(data.contributions[0].amountCentavos).toBe(25075);
    expect(data.settings.displayName).toBe('Renzo Test');
    expect(data.settings.onboardingCompleted).toBe(true);
  });

  it('imports into a fresh device, keeps custom categories, adds the standard six, and preserves balances', async () => {
    const { restore, legacy } = await importLegacyExport(legacyFixture);
    expect(restore.transactions).toBe(2);
    expect(legacy.counts.cycles).toBe(1);
    const w = await loadWorld();
    const names = w.categories.map((c) => c.name);
    for (const expected of ['Food', 'Transport', 'School Supplies', 'Bills', 'Personal', 'Others']) expect(names).toContain(expected);
    expect(names).toContain('Entertainment');
    expect(names).toContain('Shopping');
    expect(names).not.toContain('Food and Drinks');
    expect(names.filter((n) => n === 'Food')).toHaveLength(1);
    expect(names).toHaveLength(8);
    const jollibee = w.transactions.find((t) => t.merchant === 'Jollibee')!;
    expect(w.categories.find((c) => c.id === jollibee.categoryId)?.name).toBe('Food');
    const s = summarizeCycle(w.cycles[0], w.transactions, '2026-11-01');
    expect(s.spendableCentavos).toBe(190050);
    expect(s.spentCentavos).toBe(18540);
    expect(s.remainingCentavos).toBe(171510);
    expect(w.settings.displayName).toBe('Renzo Test');
  });

  it('is safe to run twice', async () => {
    await importLegacyExport(legacyFixture);
    const again = await importLegacyExport(legacyFixture);
    expect(again.restore.transactions).toBe(0);
    const w = await loadWorld();
    expect(w.transactions).toHaveLength(2);
    expect(w.cycles).toHaveLength(1);
  });

  it('reads dates from a server running in the Manila timezone', () => {
    const shifted = JSON.parse(JSON.stringify(legacyFixture));
    shifted.cycles[0].start_date = '2026-10-24T16:00:00.000Z';
    shifted.cycles[0].end_date = '2026-11-06T16:00:00.000Z';
    const { data } = convertLegacyExport(shifted);
    expect(data.cycles[0].startDate).toBe('2026-10-25');
    expect(data.cycles[0].endDate).toBe('2026-11-07');
  });

  it('rejects files that are not exports', () => {
    expect(() => convertLegacyExport({ foo: 1 })).toThrow(BackupError);
  });
});
