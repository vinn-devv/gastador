import { formatDate } from './dates';
import { formatMoney } from './money';
import type { CycleSummary } from './allowance';
import type { AlertPrefs, Category, Cycle, CycleCategoryLimit, Transaction } from './types';

export interface AlertItem {
  id: string;
  tone: 'info' | 'warn';
  text: string;
}

interface AlertInput {
  cycle: Cycle;
  summary: CycleSummary;
  prefs: AlertPrefs;
  limits: CycleCategoryLimit[];
  categories: Category[];
  transactions: Transaction[];
  today: string;
  nowHourMinute: string;
}

export function computeAlerts(input: AlertInput): AlertItem[] {
  const { cycle, summary, prefs, limits, categories, transactions, today, nowHourMinute } = input;
  if (summary.status !== 'active') return [];
  const alerts: AlertItem[] = [];
  const pct = summary.percentUsed;
  const thresholds: [number, boolean][] = [
    [100, prefs.budget100],
    [90, prefs.budget90],
    [75, prefs.budget75],
    [50, prefs.budget50]
  ];
  const hit = thresholds.find(([n]) => pct >= n);
  if (hit && hit[1]) {
    alerts.push({
      id: `budget-${hit[0]}`,
      tone: hit[0] >= 90 ? 'warn' : 'info',
      text: hit[0] === 100 ? 'You have used all of this cycle’s allowance.' : `You have used ${hit[0]}% of this cycle’s allowance.`
    });
  }
  if (prefs.categoryOverspend) {
    for (const limit of limits.filter((l) => l.cycleId === cycle.id)) {
      const spent = transactions.filter((t) => t.categoryId === limit.categoryId && t.date >= cycle.startDate && t.date <= cycle.endDate).reduce((s, t) => s + t.amountCentavos, 0);
      const name = categories.find((c) => c.id === limit.categoryId)?.name;
      if (name && spent > limit.limitCentavos) {
        alerts.push({ id: `limit-${limit.categoryId}`, tone: 'info', text: `${name} is past the limit you set: ${formatMoney(spent)} of ${formatMoney(limit.limitCentavos)}.` });
      }
    }
  }
  if (prefs.cycleEndingSoon && summary.daysRemaining > 0 && summary.daysRemaining <= prefs.cycleEndingDays) {
    const next = formatDate(cycle.endDate, false);
    alerts.push({ id: 'ending', tone: 'info', text: `This cycle ends ${summary.daysRemaining === 1 ? 'today' : `in ${summary.daysRemaining} days`} (last day: ${next}).` });
  }
  if (prefs.dailyReminder && nowHourMinute >= prefs.dailyReminderTime && !transactions.some((t) => t.date === today)) {
    alerts.push({ id: 'reminder', tone: 'info', text: 'Nothing logged yet today. Add anything you spent.' });
  }
  return alerts;
}
