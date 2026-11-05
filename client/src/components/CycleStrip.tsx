import { addDays, formatDate } from '../domain/dates';
import { formatMoney } from '../domain/money';
import type { Cycle, Transaction } from '../domain/types';

export function CycleStrip({ cycle, txs, today, plannedDaily, onDark = false }: { cycle: Cycle; txs: Transaction[]; today: string; plannedDaily: number; onDark?: boolean }) {
  const days: { date: string; total: number }[] = [];
  const totals = new Map<string, number>();
  for (const t of txs) totals.set(t.date, (totals.get(t.date) ?? 0) + t.amountCentavos);
  for (let d = cycle.startDate; d <= cycle.endDate && days.length < 62; d = addDays(d, 1)) days.push({ date: d, total: totals.get(d) ?? 0 });
  const scale = Math.max(plannedDaily * 1.6, ...days.map((d) => d.total), 1);
  const summary = `Daily spending across ${days.length} days. Planned daily amount ${formatMoney(plannedDaily)}.`;
  return (
    <figure className="mt-4" aria-label={summary}>
      <div className="relative flex h-16 items-end gap-1" aria-hidden>
        <span className={`absolute inset-x-0 border-t border-dashed ${onDark ? 'border-white/35' : 'border-primary/40'}`} style={{ bottom: `${Math.min(100, (plannedDaily / scale) * 100)}%` }} />
        {days.map((d) => {
          const future = d.date > today;
          const isToday = d.date === today;
          const height = d.total > 0 ? Math.max(8, (d.total / scale) * 100) : 4;
          const color = future
            ? onDark ? 'bg-white/15' : 'bg-line'
            : d.total > plannedDaily
              ? onDark ? 'bg-white/70' : 'bg-warn'
              : onDark ? 'bg-mint' : 'bg-primary';
          return <span key={d.date} className={`flex-1 rounded-[3px] ${color} ${isToday ? `ring-2 ${onDark ? 'ring-white' : 'ring-primary'}` : ''}`} style={{ height: `${height}%` }} />;
        })}
      </div>
      <figcaption className={`mt-1.5 flex justify-between text-xs ${onDark ? 'text-white/75' : 'text-muted'}`}>
        <span>{formatDate(cycle.startDate, false)}</span>
        <span>dashed line: planned daily amount</span>
        <span>{formatDate(cycle.endDate, false)}</span>
      </figcaption>
    </figure>
  );
}
