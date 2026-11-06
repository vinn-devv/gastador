import {
  ArrowUpRight,
  CalendarClock,
  ChartNoAxesColumn,
  ChevronRight,
  History,
  Info,
  PiggyBank,
  Plus,
  ScanLine,
  Settings2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "../app/DataProvider";
import { CategoryIcon } from "../components/CategoryIcon";
import { LogoMark } from "../components/Logo";
import { TransactionRow } from "../components/TransactionRow";
import { Banner, ScreenSkeleton } from "../components/ui/Bits";
import { Page } from "../components/ui/PageHeader";
import { computeAlerts } from "../domain/alerts";
import { transactionsInCycle } from "../domain/allowance";
import { diffDays, formatDate, formatRange, manilaHour, manilaHourMinute } from "../domain/dates";
import { byCategory } from "../domain/insights";
import { formatMoney, ratioPercent } from "../domain/money";
import { goalProgress } from "../domain/savings";

function greeting(): string {
  const hour = manilaHour();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link to={to} className="canvas-action">
      <span className="canvas-action__icon"><Icon size={20} strokeWidth={1.65} aria-hidden /></span>
      <span>{label}</span>
      <ArrowUpRight size={13} className="canvas-action__arrow" aria-hidden />
    </Link>
  );
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let path = "M " + points[0].x + " " + points[0].y;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += " Q " + current.x + " " + current.y + " " + midX + " " + midY;
  }
  const last = points[points.length - 1];
  path += " T " + last.x + " " + last.y;
  return path;
}

function SpendingWave({
  transactions,
  cycle,
  today,
}: {
  transactions: { date: string; amountCentavos: number }[];
  cycle: { startDate: string; endDate: string };
  today: string;
}) {
  const elapsed = Math.max(1, Math.min(diffDays(cycle.startDate, today) + 1, diffDays(cycle.startDate, cycle.endDate) + 1));
  const buckets = Array.from({ length: 12 }, () => 0);

  transactions.forEach((transaction) => {
    const day = diffDays(cycle.startDate, transaction.date);
    if (day < 0 || day >= elapsed) return;
    const index = Math.min(11, Math.floor((day / elapsed) * 12));
    buckets[index] += transaction.amountCentavos;
  });

  if (!buckets.some((value) => value > 0)) {
    return (
      <div className="canvas-wave-empty">
        <div className="canvas-wave-empty__line" aria-hidden="true" />
        <p>Your spending rhythm will take shape here.</p>
        <small>Each expense you record adds another point to the picture.</small>
      </div>
    );
  }

  const max = Math.max(...buckets, 1);
  const points = buckets.map((value, index) => ({
    x: 18 + index * 55,
    y: 132 - (value / max) * 92,
  }));
  const line = smoothPath(points);
  const area = line + " L " + points[points.length - 1].x + " 152 L 18 152 Z";
  const last = points[points.length - 1];

  return (
    <figure className="canvas-wave">
      <svg viewBox="0 0 635 166" role="img" aria-label="Recorded daily spending in the current allowance cycle">
        <defs>
          <linearGradient id="canvas-wave-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#65AEFF" stopOpacity=".25" />
            <stop offset="100%" stopColor="#398BFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="canvas-wave-stroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#398BFF" />
            <stop offset="50%" stopColor="#70B7FF" />
            <stop offset="100%" stopColor="#C3E2FF" />
          </linearGradient>
        </defs>
        {[34, 74, 114, 152].map((y) => (
          <line key={y} x1="12" x2="623" y1={y} y2={y} className="canvas-wave__guide" />
        ))}
        <path d={area} fill="url(#canvas-wave-fill)" className="canvas-wave__area" />
        <path d={line} fill="none" stroke="url(#canvas-wave-stroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="canvas-wave__stroke" />
        <circle cx={last.x} cy={last.y} r="12" className="canvas-wave__pulse" />
        <circle cx={last.x} cy={last.y} r="4" className="canvas-wave__point" />
      </svg>
      <figcaption>
        <span>{formatDate(cycle.startDate, false)}</span>
        <span>Daily spending</span>
        <span>{formatDate(today, false)}</span>
      </figcaption>
    </figure>
  );
}

export default function Home() {
  const { world, error, today, current, summary, categoryById } = useData();
  const alerts = useMemo(
    () => world && current && summary ? computeAlerts({
      cycle: current.cycle,
      summary,
      prefs: world.settings.alerts,
      limits: world.limits,
      categories: world.categories,
      transactions: world.transactions,
      today,
      nowHourMinute: manilaHourMinute(),
    }) : [],
    [world, current, summary, today],
  );

  if (error) {
    return <Page><Banner tone="bad" title="Could not open your data">{error.message}</Banner></Page>;
  }
  if (!world) return <ScreenSkeleton />;

  const firstName = world.settings.displayName.trim().split(/\s+/)[0];
  const recent = world.transactions.slice(0, 5);

  if (!current || !summary) {
    return (
      <Page className="money-canvas">
        <header className="canvas-header">
          <div>
            <span className="canvas-kicker">GASTADOR / YOUR MONEY</span>
            <h1>{greeting()}{firstName ? ", " + firstName : ""}</h1>
            <p>{formatDate(today)} · A clearer view starts here.</p>
          </div>
          <LogoMark size={42} />
        </header>
        <section className="canvas-no-cycle">
          <span className="canvas-kicker">FIRST, SET YOUR DIRECTION</span>
          <h2>Give every peso<br />somewhere to go.</h2>
          <p>Set an allowance cycle and Gastador will help you follow what comes in, what goes out, and what remains.</p>
          <Link to="/settings/allowance/new" className="canvas-primary-link">Set up your allowance <ArrowUpRight size={18} /></Link>
          <div className="canvas-no-cycle__orbit" aria-hidden="true" />
        </section>
      </Page>
    );
  }

  const cycle = current.cycle;
  const inCycle = transactionsInCycle(cycle, world.transactions);
  const categories = byCategory(inCycle).slice(0, 4);
  const goals = world.goals.map((goal) => goalProgress(goal, world.contributions, today));
  const isOver = summary.remainingCentavos < 0;
  const usedPercent = Math.max(0, Math.min(100, summary.percentUsed));
  const cycleLabel = cycle.name.startsWith("Allowance from")
    ? formatRange(cycle.startDate, cycle.endDate)
    : cycle.name;
  const balanceLabel = isOver
    ? "OVER THE ALLOWANCE BY"
    : summary.status === "ended" ? "LEFT AT THE END" : "AVAILABLE TO SPEND";
  const balanceValue = formatMoney(Math.abs(summary.remainingCentavos));
  const paceText = {
    not_started: "Starts in " + summary.daysUntilStart + " day" + (summary.daysUntilStart === 1 ? "" : "s"),
    on_track: "You're on pace with your plan",
    above_pace: "Spending is above your planned daily pace",
    over_budget: "Over the allowance by " + formatMoney(-summary.remainingCentavos),
    ended: "This cycle has ended",
  }[summary.pace];

  return (
    <Page className="money-canvas">
      <header className="canvas-header">
        <div className="canvas-header__copy">
          <span className="canvas-kicker">GASTADOR / YOUR MONEY, IN MOTION</span>
          <h1>{greeting()}{firstName ? ", " + firstName : ""}</h1>
          <p>{formatDate(today)} <span aria-hidden="true">·</span> {cycleLabel}</p>
        </div>
        <div className="canvas-header__mark" aria-label="Gastador">
          <LogoMark size={34} />
        </div>
      </header>

      {summary.status === "ended" && (
        <div className="canvas-cycle-alert">
          <CalendarClock size={16} />
          <span>Your cycle ended on {formatDate(cycle.endDate)}.</span>
          <Link to="/settings/allowance/new">Start another <ArrowUpRight size={14} /></Link>
        </div>
      )}

      <section className="canvas-hero" aria-label="Available allowance balance">
        <div className="canvas-hero__motion" aria-hidden="true">
          <span className="canvas-hero__ribbon canvas-hero__ribbon--a" />
          <span className="canvas-hero__ribbon canvas-hero__ribbon--b" />
          <span className="canvas-hero__orb canvas-hero__orb--a" />
          <span className="canvas-hero__orb canvas-hero__orb--b" />
          <span className="canvas-hero__orbit canvas-hero__orbit--a" />
          <span className="canvas-hero__orbit canvas-hero__orbit--b" />
          <span className="canvas-hero__spark canvas-hero__spark--a" />
          <span className="canvas-hero__spark canvas-hero__spark--b" />
          <span className="canvas-hero__spark canvas-hero__spark--c" />
        </div>

        <div className="canvas-hero__content">
          <span className="canvas-kicker">{balanceLabel}</span>
          <strong className={"canvas-hero__amount num" + (isOver ? " is-over" : "")} data-testid="remaining">
            {balanceValue}
          </strong>
          <div className="canvas-hero__status">
            <span className="canvas-hero__status-dot" />
            <span>{paceText}</span>
          </div>
          <div className="canvas-hero__cycle">
            <span>{cycleLabel}</span>
            <span className="canvas-hero__cycle-dot" />
            <span>{summary.status === "ended" ? "Cycle complete" : summary.daysRemaining + " days left"}</span>
          </div>
        </div>

        <div className="canvas-hero__metrics">
          <div>
            <span>Allowance</span>
            <strong className="num">{formatMoney(summary.spendableCentavos)}</strong>
          </div>
          <div>
            <span>Spent</span>
            <strong className="num">{formatMoney(summary.spentCentavos)}</strong>
          </div>
          <div>
            <span>Safe per day</span>
            <strong className="num" data-testid="daily-limit">
              {summary.dailySafeLimitCentavos === null ? "—" : formatMoney(summary.dailySafeLimitCentavos)}
            </strong>
          </div>
        </div>

        <div className="canvas-hero__progress" role="progressbar" aria-label="Allowance used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usedPercent)}>
          <span style={{ width: usedPercent + "%" }} />
        </div>
        <div className="canvas-hero__progress-label">
          <span>Allowance used</span>
          <strong>{Math.round(summary.percentUsed)}%</strong>
        </div>
      </section>

      <section className="canvas-actions" aria-label="Quick actions">
        <div className="canvas-section-title">
          <span className="canvas-kicker">MOVE WITH INTENTION</span>
          <h2>What would you like to do?</h2>
        </div>
        <div className="canvas-actions__row">
          <QuickAction to="/snap" icon={ScanLine} label="Scan receipt" />
          <QuickAction to="/activity/new" icon={Plus} label="Add expense" />
          <QuickAction to="/activity" icon={History} label="Activity" />
          <QuickAction to="/settings/allowance" icon={Settings2} label="Allowance" />
        </div>
      </section>

      {alerts.length > 0 && (
        <div className="canvas-alert-stream" aria-label="Spending notes">
          <Info size={15} />
          <div className="canvas-alert-stream__track">
            <span>{alerts.map((alert) => alert.text).join("  ·  ")}</span>
          </div>
        </div>
      )}

      <section className="canvas-insights" aria-label="Spending activity">
        <div className="canvas-section-title canvas-section-title--row">
          <div>
            <span className="canvas-kicker">THE SPENDING RHYTHM</span>
            <h2>Watch your money move.</h2>
            <p>A live picture of what you've recorded this cycle.</p>
          </div>
          <Link to="/insights" className="canvas-text-link">Explore insights <ArrowUpRight size={15} /></Link>
        </div>
        <div className="canvas-insights__highlights">
          <div>
            <span>Spent so far</span>
            <strong className="num">{formatMoney(summary.spentCentavos)}</strong>
          </div>
          <div>
            <span>Remaining</span>
            <strong className="num">{formatMoney(Math.max(0, summary.remainingCentavos))}</strong>
          </div>
          <div>
            <span>Allowance used</span>
            <strong className="num">{Math.round(summary.percentUsed)}%</strong>
          </div>
        </div>
        <SpendingWave transactions={inCycle} cycle={cycle} today={today} />
      </section>

      <section className="canvas-ledger">
        <div className="canvas-section-title canvas-section-title--row">
          <div>
            <span className="canvas-kicker">RECENT ACTIVITY</span>
            <h2>Every peso has a story.</h2>
          </div>
          <Link to="/activity" className="canvas-text-link">All activity <ArrowUpRight size={15} /></Link>
        </div>
        {recent.length === 0 ? (
          <div className="canvas-ledger__empty">
            <p>Nothing recorded yet.</p>
            <span>Your first expense will appear here.</span>
            <Link to="/activity/new">Record an expense <ArrowUpRight size={15} /></Link>
          </div>
        ) : (
          <ul className="canvas-ledger__list">
            {recent.map((transaction, index) => (
              <li key={transaction.id} style={{ "--row-index": index } as React.CSSProperties}>
                <TransactionRow
                  tx={transaction}
                  categoryName={categoryById.get(transaction.categoryId)?.name ?? "Unknown"}
                  showDate
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="canvas-bottom">
        {categories.length > 0 && (
          <section className="canvas-categories">
            <div className="canvas-section-title">
              <span className="canvas-kicker">WHERE IT GOES</span>
              <h2>Your spending, by category.</h2>
            </div>
            <ul className="canvas-category-list">
              {categories.map((category) => {
                const categoryName = categoryById.get(category.key)?.name ?? "Unknown";
                const share = ratioPercent(category.total, summary.spentCentavos);
                return (
                  <li key={category.key}>
                    <div className="canvas-category-list__heading">
                      <span className="canvas-category-list__name"><CategoryIcon name={categoryName} size={17} />{categoryName}</span>
                      <strong className="num">{formatMoney(category.total)}</strong>
                    </div>
                    <div className="canvas-category-list__track">
                      <span style={{ width: Math.max(0, Math.min(100, share)) + "%" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {goals.length > 0 && (
          <section className="canvas-savings">
            <div className="canvas-section-title">
              <span className="canvas-kicker">A LITTLE FURTHER</span>
              <h2>{goals[0].goal.name}</h2>
            </div>
            <div className="canvas-savings__headline">
              <strong className="num">{formatMoney(goals[0].savedCentavos)}</strong>
              <span>of {formatMoney(goals[0].goal.targetCentavos)}</span>
            </div>
            <div className="canvas-savings__track">
              <span style={{ width: Math.max(0, Math.min(100, goals[0].percent)) + "%" }} />
            </div>
            <div className="canvas-savings__footer">
              <span>{Math.round(goals[0].percent)}% of the way there</span>
              <Link to="/settings/savings">View goal <ChevronRight size={14} /></Link>
            </div>
          </section>
        )}

        {categories.length === 0 && goals.length === 0 && (
          <section className="canvas-savings canvas-savings--empty">
            <span className="canvas-kicker">YOUR NEXT CHAPTER</span>
            <h2>Make space for a goal.</h2>
            <p>Set a savings goal and watch your progress grow.</p>
            <Link to="/settings/savings">Create a goal <ArrowUpRight size={15} /></Link>
          </section>
        )}
      </div>
    </Page>
  );
}
