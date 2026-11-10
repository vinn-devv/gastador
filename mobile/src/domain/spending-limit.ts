import type { Cycle } from "./types";

export type SpendingCycle = Pick<
  Cycle,
  "allowanceCentavos" | "carryoverCentavos" | "plannedSavingsCentavos"
>;

export type ExpenseValidation =
  | { ok: true }
  | { ok: false; code: "INSUFFICIENT_FUNDS"; remainingCentavos: number };

export function remainingCentavos(
  cycle: SpendingCycle,
  spentCentavos: number,
): number {
  const spendable =
    cycle.allowanceCentavos +
    cycle.carryoverCentavos -
    cycle.plannedSavingsCentavos;
  return Math.max(0, spendable - spentCentavos);
}

export function validateExpense({
  amountCentavos,
  remainingCentavos: remaining,
  replacingCentavos = 0,
}: {
  amountCentavos: number;
  remainingCentavos: number;
  replacingCentavos?: number;
}): ExpenseValidation {
  if (
    !Number.isSafeInteger(amountCentavos) ||
    amountCentavos <= 0 ||
    !Number.isSafeInteger(replacingCentavos) ||
    replacingCentavos < 0 ||
    !Number.isFinite(remaining) ||
    remaining < 0
  ) {
    return {
      ok: false,
      code: "INSUFFICIENT_FUNDS",
      remainingCentavos: Number.isFinite(remaining) ? Math.max(0, remaining) : 0,
    };
  }

  return amountCentavos - replacingCentavos <= remaining
    ? { ok: true }
    : {
        ok: false,
        code: "INSUFFICIENT_FUNDS",
        remainingCentavos: remaining,
      };
}
