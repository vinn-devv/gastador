import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabaseForTests } from './db';
import {
  addCategory,
  addContribution,
  addGoal,
  addTransaction,
  createCycle,
  deleteCycle,
  deleteGoal,
  deleteTransaction,
  DuplicateError,
  ensureReady,
  getReceiptBlob,
  loadWorld,
  renameCategory,
  resetReadyForTests,
  saveReceipt,
  setCategoryArchived,
  setCycleLimit,
  updateCycle,
  updateSettings,
  updateTransaction,
  wipeAllData,
  type TransactionInput
} from './repo';
import { ValidationError } from '../domain/validation';
import { summarizeCycle } from '../domain/allowance';

async function reset() {
  await resetDatabaseForTests();
  resetReadyForTests();
  await ensureReady();
}

async function firstCategoryId() {
  return (await loadWorld()).categories[0].id;
}

const cycleInput = {
  name: 'Nov A',
  frequency: 'biweekly' as const,
  startDate: '2026-11-01',
  endDate: '2026-11-14',
  allowanceCentavos: 200000,
  plannedSavingsCentavos: 0
};

async function txInput(over: Partial<TransactionInput> = {}): Promise<TransactionInput> {
  return {
    amountCentavos: 5000,
    occurredAt: '2026-11-02T04:00:00.000Z',
    merchant: 'Canteen',
    categoryId: await firstCategoryId(),
    paymentMethod: 'cash',
    ...over
  };
}

beforeEach(reset);

describe('first run', () => {
  it('seeds the six standard categories and default settings', async () => {
    const w = await loadWorld();
    expect(w.categories.map((c) => c.name)).toEqual(['Food', 'Transport', 'School Supplies', 'Bills', 'Personal', 'Others']);
    expect(w.settings.onboardingCompleted).toBe(false);
    expect(w.settings.currency).toBe('PHP');
  });

  it('does not reseed existing data on later opens', async () => {
    await addCategory('Pets');
    resetReadyForTests();
    await ensureReady();
    expect((await loadWorld()).categories).toHaveLength(7);
  });
});

describe('transaction CRUD', () => {
  it('creates, edits, and deletes an expense with Manila dates', async () => {
    const created = await addTransaction(await txInput({ amountCentavos: 12540, occurredAt: '2026-10-31T16:30:00.000Z', merchant: '  Jollibee   Katipunan ' }));
    expect(created.date).toBe('2026-11-01');
    expect(created.merchant).toBe('Jollibee Katipunan');
    expect(created.amountCentavos).toBe(12540);

    const edited = await updateTransaction(created.id, await txInput({ amountCentavos: 9900, merchant: 'Jollibee', occurredAt: '2026-10-31T10:00:00.000Z', isSplurge: true, description: ' treat ' }));
    expect(edited.date).toBe('2026-10-31');
    expect(edited.isSplurge).toBe(true);
    expect(edited.description).toBe('treat');
    expect((await loadWorld()).transactions).toHaveLength(1);

    await deleteTransaction(created.id);
    expect((await loadWorld()).transactions).toHaveLength(0);
  });

  it('persists across a simulated reload', async () => {
    await addTransaction(await txInput());
    resetReadyForTests();
    const w = await loadWorld();
    expect(w.transactions).toHaveLength(1);
    expect(w.transactions[0].merchant).toBe('Canteen');
  });

  it('rejects invalid input with field messages', async () => {
    await expect(addTransaction(await txInput({ amountCentavos: 0 }))).rejects.toBeInstanceOf(ValidationError);
    await expect(addTransaction(await txInput({ merchant: '   ' }))).rejects.toMatchObject({ fields: { merchant: expect.any(String) } });
    await expect(addTransaction(await txInput({ occurredAt: 'nope' }))).rejects.toMatchObject({ fields: { occurredAt: expect.any(String) } });
    await expect(addTransaction(await txInput({ categoryId: 'missing' }))).rejects.toMatchObject({ fields: { categoryId: expect.any(String) } });
    expect((await loadWorld()).transactions).toHaveLength(0);
  });

  it('warns about duplicates unless explicitly allowed', async () => {
    await addTransaction(await txInput());
    await expect(addTransaction(await txInput())).rejects.toBeInstanceOf(DuplicateError);
    await addTransaction(await txInput(), { allowDuplicate: true });
    expect((await loadWorld()).transactions).toHaveLength(2);
  });

  it('refuses archived categories for new expenses', async () => {
    const cat = await addCategory('Pets');
    await setCategoryArchived(cat.id, true);
    await expect(addTransaction(await txInput({ categoryId: cat.id }))).rejects.toMatchObject({ fields: { categoryId: expect.any(String) } });
  });
});

describe('categories', () => {
  it('prevents duplicate names and keeps at least one active category', async () => {
    await expect(addCategory(' food ')).rejects.toBeInstanceOf(ValidationError);
    const w = await loadWorld();
    await expect(renameCategory(w.categories[1].id, 'Food')).rejects.toBeInstanceOf(ValidationError);
    for (const c of w.categories.slice(1)) await setCategoryArchived(c.id, true);
    await expect(setCategoryArchived(w.categories[0].id, true)).rejects.toBeInstanceOf(ValidationError);
  });

  it('restores an archived category when its name is added again', async () => {
    const cat = await addCategory('Pets');
    await setCategoryArchived(cat.id, true);
    const again = await addCategory('pets');
    expect(again.id).toBe(cat.id);
    expect(again.archivedAt).toBeNull();
  });
});

describe('allowance cycles', () => {
  it('creates a cycle and computes balances from transactions', async () => {
    const cycle = await createCycle(cycleInput);
    await addTransaction(await txInput({ amountCentavos: 30000 }));
    const w = await loadWorld();
    const s = summarizeCycle(w.cycles[0], w.transactions, '2026-11-03');
    expect(cycle.carryoverCentavos).toBe(0);
    expect(s.remainingCentavos).toBe(170000);
  });

  it('rejects overlapping cycles but accepts adjacent ones and self-edits', async () => {
    const a = await createCycle(cycleInput);
    await expect(createCycle({ ...cycleInput, name: 'Overlap', startDate: '2026-11-14', endDate: '2026-11-20' })).rejects.toMatchObject({ fields: { startDate: expect.stringContaining('overlap') } });
    await createCycle({ ...cycleInput, name: 'Nov B', startDate: '2026-11-15', endDate: '2026-11-28' });
    await updateCycle(a.id, { ...cycleInput, allowanceCentavos: 250000 });
    expect((await loadWorld()).cycles.find((c) => c.id === a.id)!.allowanceCentavos).toBe(250000);
  });

  it('validates dates, amounts, and planned savings', async () => {
    await expect(createCycle({ ...cycleInput, endDate: '2026-10-31' })).rejects.toMatchObject({ fields: { endDate: expect.any(String) } });
    await expect(createCycle({ ...cycleInput, startDate: '2026-02-30' })).rejects.toMatchObject({ fields: { startDate: expect.any(String) } });
    await expect(createCycle({ ...cycleInput, plannedSavingsCentavos: 300000 })).rejects.toMatchObject({ fields: { plannedSavings: expect.any(String) } });
    await expect(createCycle({ ...cycleInput, allowanceCentavos: -1 })).rejects.toMatchObject({ fields: { allowance: expect.any(String) } });
  });

  it('carries over only the previous positive remainder', async () => {
    const a = await createCycle(cycleInput);
    await addTransaction(await txInput({ amountCentavos: 50000 }));
    const b = await createCycle({ ...cycleInput, name: 'Nov B', startDate: '2026-11-15', endDate: '2026-11-28' }, { carryFromCycleId: a.id });
    expect(b.carryoverCentavos).toBe(150000);
    const c = await createCycle({ ...cycleInput, name: 'Nov C', startDate: '2026-11-29', endDate: '2026-12-12' }, { carryFromCycleId: 'missing' });
    expect(c.carryoverCentavos).toBe(0);
  });

  it('keeps transactions and removes limits when a cycle is deleted', async () => {
    const cycle = await createCycle(cycleInput);
    await setCycleLimit(cycle.id, await firstCategoryId(), 10000);
    await addTransaction(await txInput());
    await deleteCycle(cycle.id);
    const w = await loadWorld();
    expect(w.cycles).toHaveLength(0);
    expect(w.limits).toHaveLength(0);
    expect(w.transactions).toHaveLength(1);
  });

  it('moves an expense to another cycle when its date is edited', async () => {
    await createCycle(cycleInput);
    await createCycle({ ...cycleInput, name: 'Nov B', startDate: '2026-11-15', endDate: '2026-11-28' });
    const tx = await addTransaction(await txInput({ amountCentavos: 7000 }));
    await updateTransaction(tx.id, await txInput({ amountCentavos: 7000, occurredAt: '2026-11-16T04:00:00.000Z' }));
    const w = await loadWorld();
    const [b, a] = w.cycles;
    expect(summarizeCycle(a, w.transactions, '2026-11-20').spentCentavos).toBe(0);
    expect(summarizeCycle(b, w.transactions, '2026-11-20').spentCentavos).toBe(7000);
  });
});

describe('savings stay separate from expenses', () => {
  it('records goals and contributions without touching transactions', async () => {
    await createCycle(cycleInput);
    const goal = await addGoal({ name: 'Laptop', targetCentavos: 500000, targetDate: null });
    await addContribution(goal.id, 25075);
    const w = await loadWorld();
    expect(w.contributions).toHaveLength(1);
    expect(w.transactions).toHaveLength(0);
    expect(summarizeCycle(w.cycles[0], w.transactions, '2026-11-02').spentCentavos).toBe(0);
    await deleteGoal(goal.id);
    expect((await loadWorld()).contributions).toHaveLength(0);
  });

  it('validates goals and contributions', async () => {
    await expect(addGoal({ name: '', targetCentavos: 100, targetDate: null })).rejects.toBeInstanceOf(ValidationError);
    await expect(addGoal({ name: 'x', targetCentavos: 0, targetDate: null })).rejects.toBeInstanceOf(ValidationError);
    await expect(addContribution('nope', 100)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('receipts and settings', () => {
  it('stores receipt images locally and removes them with their expense', async () => {
    const hash = await saveReceipt(new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' }));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    const tx = await addTransaction(await txInput({ receiptHashes: [hash] }));
    const blob = await getReceiptBlob(hash);
    expect(blob?.type).toBe('image/jpeg');
    expect(blob?.size).toBe(4);
    await deleteTransaction(tx.id);
    expect(await getReceiptBlob(hash)).toBeNull();
  });

  it('updates settings including nested alert preferences', async () => {
    const s = await updateSettings({ displayName: 'Renzo', theme: 'dark', alerts: { budget90: false } });
    expect(s.displayName).toBe('Renzo');
    expect(s.alerts.budget90).toBe(false);
    expect(s.alerts.budget75).toBe(true);
    expect((await loadWorld()).settings.theme).toBe('dark');
  });

  it('wipes everything and reseeds a fresh start', async () => {
    await createCycle(cycleInput);
    await addTransaction(await txInput());
    await wipeAllData();
    const w = await loadWorld();
    expect(w.cycles).toHaveLength(0);
    expect(w.transactions).toHaveLength(0);
    expect(w.categories).toHaveLength(6);
  });
});
