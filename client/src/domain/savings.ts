import { diffDays } from './dates';
import { ratioPercent, type Centavos } from './money';
import type { SavingsContribution, SavingsGoal } from './types';

export interface GoalProgress {
  goal: SavingsGoal;
  savedCentavos: Centavos;
  remainingCentavos: Centavos;
  percent: number;
  daysLeft: number | null;
  perDayCentavos: Centavos | null;
}

export function goalProgress(goal: SavingsGoal, contributions: SavingsContribution[], today: string): GoalProgress {
  const saved = contributions.filter((c) => c.goalId === goal.id).reduce((sum, c) => sum + c.amountCentavos, 0);
  const remaining = Math.max(0, goal.targetCentavos - saved);
  const daysLeft = goal.targetDate ? diffDays(today, goal.targetDate) : null;
  const perDay = daysLeft !== null && daysLeft > 0 && remaining > 0 ? Math.ceil(remaining / daysLeft) : null;
  return {
    goal,
    savedCentavos: saved,
    remainingCentavos: remaining,
    percent: Math.min(100, ratioPercent(saved, goal.targetCentavos)),
    daysLeft,
    perDayCentavos: perDay
  };
}
