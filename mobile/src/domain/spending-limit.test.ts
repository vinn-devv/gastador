import assert from "node:assert/strict";
import testCase from "node:test";
import { remainingCentavos, validateExpense } from "./spending-limit";
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

testCase("a date with no allowance cycle can be handled without applying a spending limit", () => {
  // Repository behavior: no matching cycle skips validateExpense and permits a valid amount.
  assert.deepEqual(validateExpense({ amountCentavos: 100, remainingCentavos: 100 }), { ok: true });
});

testCase("sequential saves cannot both consume the same remaining balance", () => {
  let remaining = 100;
  const first = validateExpense({ amountCentavos: 75, remainingCentavos: remaining });
  assert.equal(first.ok, true);
  if (first.ok) remaining = remainingCentavos({ ...cycle, allowanceCentavos: 100, carryoverCentavos: 0, plannedSavingsCentavos: 0 }, 75);
  const second = validateExpense({ amountCentavos: 75, remainingCentavos: remaining });
  assert.deepEqual(second, { ok: false, code: "INSUFFICIENT_FUNDS", remainingCentavos: 25 });
});
