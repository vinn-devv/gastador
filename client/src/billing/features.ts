import type { Entitlement } from "./types";

export const FREE_LIMITS = {
  snapImportsPerCycle: 10,
  savingsGoals: 2,
  insightsMaxDays: 31,
} as const;

export interface AccessContext {
  entitlement: Entitlement | null;
  enforcement: boolean;
  production: boolean;
  prototypeMode?: boolean;
}

export function isUnlocked(ctx: AccessContext): boolean {
  if (ctx.prototypeMode) return true;
  if (!ctx.enforcement) return true;
  const e = ctx.entitlement;
  if (!e) return false;
  if (e.source === "test") return !ctx.production;
  return e.source === "play" && e.verifiedAt !== null;
}

export function canImportMore(
  ctx: AccessContext,
  importsThisCycle: number,
): boolean {
  return isUnlocked(ctx) || importsThisCycle < FREE_LIMITS.snapImportsPerCycle;
}

export function canAddGoal(ctx: AccessContext, goalCount: number): boolean {
  return isUnlocked(ctx) || goalCount < FREE_LIMITS.savingsGoals;
}

export function maxInsightsDays(ctx: AccessContext): number {
  return isUnlocked(ctx) ? 3660 : FREE_LIMITS.insightsMaxDays;
}
