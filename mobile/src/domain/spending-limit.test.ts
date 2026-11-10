import assert from "node:assert/strict";
import testCase from "node:test";
import { remainingCentavos, validateExpense } from "./spending-limit";
import { createTransaction, InsufficientFundsError } from "../data/repository";
import type { SQLiteDatabase } from "expo-sqlite";
import type { Cycle } from "./types";
import { manilaToday } from "./dates";
import type { Cycle } from "./types";

const cycle: Pick<Cycle, "allowanceCentavos" | "carryoverCentavos" | "plannedSavingsCentavos"> = {
  allowanceCentavos: 10_000,
  carryoverCentavos: 500,
  plannedSavingsCentavos: 500,
};

testCase("remaining balance includes carry-over and excludes planned savings, never below zero", () => {
  assert.equal(remainingCentavos(cycle, 9_500), 500);
  assert.equal(remainingCentavos(cycle, 20_000), 0);
});

testCase("an expense equal to the remaining balance is allowed", () => {
  assert.deepEqual(validateExpense({ amountCentavos: 500, remainingCentavos: 500 }), { ok: true });
});

testCase("one centavo over the remaining balance is rejected", () => {
  assert.deepEqual(validateExpense({ amountCentavos: 501, remainingCentavos: 500 }), {
    ok: false, code: "INSUFFICIENT_FUNDS", remainingCentavos: 500,
  });
});

testCase("zero remaining rejects every positive expense", () => {
  assert.deepEqual(validateExpense({ amountCentavos: 1, remainingCentavos: 0 }), {
    ok: false, code: "INSUFFICIENT_FUNDS", remainingCentavos: 0,
  });
});

testCase("an edit that raises an expense beyond the remainder is rejected", () => {
  assert.equal(validateExpense({ amountCentavos: 601, replacingCentavos: 100, remainingCentavos: 500 }).ok, false);
});

testCase("an edit that lowers an expense is allowed", () => {
  assert.deepEqual(validateExpense({ amountCentavos: 50, replacingCentavos: 100, remainingCentavos: 0 }), { ok: true });
});

testCase("negative, zero, NaN, and non-finite amounts are rejected", () => {
  for (const amountCentavos of [-1, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(validateExpense({ amountCentavos, remainingCentavos: 100 }).ok, false);
  }
});

function fakeDatabase(cycles: Cycle[]) {
  const saved: { amountCentavos: number; date: string }[] = [];
  let db: SQLiteDatabase;
  db = {
    withExclusiveTransactionAsync: async (task: (txn: SQLiteDatabase) => Promise<void>) => task(db),
    getAllAsync: async <T,>() => cycles as T[],
    getFirstAsync: async <T,>(_sql: string, startDate: string, endDate: string) => ({
      spentCentavos: saved
        .filter((item) => item.date >= startDate && item.date <= endDate)
        .reduce((sum, item) => sum + item.amountCentavos, 0),
    }) as T,
    runAsync: async (_sql: string, ...params: (string | number | null)[]) => {
      saved.push({ amountCentavos: Number(params[1]), date: String(params[3]) });
      return { changes: 1, lastInsertRowId: 1 };
    },
  } as unknown as SQLiteDatabase;
  return { db, saved };
}

const activeCycle: Cycle = {
  id: "cycle-test",
  name: "Test allowance",
  frequency: "weekly",
  startDate: "2020-01-01",
  endDate: "2030-01-01",
  allowanceCentavos: 100,
  carryoverCentavos: 0,
  plannedSavingsCentavos: 0,
  createdAt: "2020-01-01T00:00:00.000Z",
};

const expenseInput = (amountCentavos: number) => ({
  amountCentavos,
  date: manilaToday(),
  merchant: "Test",
  categoryId: "category-test",
  paymentMethod: "cash" as const,
});

testCase("an expense dated outside every allowance cycle is allowed", async () => {
  const { db, saved } = fakeDatabase([]);
  await createTransaction(db, expenseInput(100));
  assert.equal(saved.length, 1);
});

testCase("sequential expense saves cannot both consume the same remaining balance", async () => {
  const { db, saved } = fakeDatabase([activeCycle]);
  await createTransaction(db, expenseInput(75));
  await assert.rejects(
    createTransaction(db, expenseInput(75)),
    (error: unknown) =>
      error instanceof InsufficientFundsError &&
      error.remainingCentavos === 25,
  );
  assert.equal(saved.length, 1);
});
