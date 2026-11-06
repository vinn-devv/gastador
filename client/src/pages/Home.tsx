import {
  ArrowUpRight,
  CalendarClock,
  ChartNoAxesColumn,
  ChevronRight,
  Clock3,
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
    <Link to={to} className="wallet-action">
      <span className="wallet-action__bubble"><Icon size={21} strokeWidth={1.75} aria-hidden /></span>
      <span>{label}</span>
    </Link>
  );
}

function SpendingChart({
  transactions,
  cycle,
  today,
}: {
  transactions: { date: string; amountCentavos: number }[];
  cycle: { startDate: string; endDate: string };
  today: string;
}) {
  const span = Math.max(1, Math.min(diffDays(cycle.startDate, today) + 1, diffDays(cycle.startDate, cycle.endDate) + 1));
  const buckets = Array.from({ length: 12 }, () => 0);
  transactions.forEach((tx) => {
    const day = diffDays(cycle.startDate, tx.date);
    if (day < 0 || day >= span) return;
    const index = Math.min(11, Math.floor((day / span) * 12));
    buckets[index] += tx.amountCentavos;
  });

  if (!buckets.some((value) => value > 0)) {
    return (
      <div className="wallet-chart-empty">
        <span className="wallet-chart-empty__symbol"><ChartNoAxesColumn size={19} /></span>
        <p>Your spending line will appear here.</p>
        <small>Record an expense to see your activity through the cycle.</small>
      </div>
    );
  }

  const max = Math.max(...buckets, 1);
  const points = buckets.map((value, index) => ({
    x: 30 + index * 55,
    y: 150 - (value / max) * 98,
  }));
  const line = points.map((point, index) => (index === 0 ? "M " : "L ") + point.x + " " + point.y).join(" ");
  const last = points[points.length - 1];
  const area = line + " L " + last.x + " 168 L 30 168 Z";

  return (
    <figure className="wallet-chart">
      <svg viewBox="0 0 660 190" role="img" aria-label="Daily recorded spending through the current allowance cycle">
        <defs>
          <linearGradient id="wallet-chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#398BFF" stopOpacity=".34" />
            <stop offset="100%" stopColor="#398BFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wallet-chart-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#398BFF" />
            <stop offset="100%" stopColor="#A4D1FF" />
          </linearGradient>
        </defs>
        {[52, 96, 140, 168].map((y) => (
          <line key={y} x1="24" x2="646" y1={y} y2={y} className="wallet-chart__grid" />
        ))}
        <path d={area} fill="url(#wallet-chart-fill)" />
        <path d={line} fill="none" stroke="url(#wallet-chart-line)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="wallet-chart__path" />
        <circle cx={last.x} cy={last.y} r="8" fill="#398BFF" opacity=".18" />
        <circle cx={last.x} cy={last.y} r="4" fill="#B8DCFF" stroke="#398BFF" strokeWidth="2" />
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
      <Page className="wallet-dashboard">
        <header className="wallet-header">
          <div>
            <span className="wallet-overline">GASTADOR / YOUR MONEY</span>
            <h1>{greeting()}{firstName ? ", " + firstName : ""}</h1>
            <p>{formatDate(today)} · Keep your next peso in view.</p>
          </div>
          <LogoMark size={42} />
        </header>
        <section className="wallet-empty-state">
          <div className="wallet-empty-state__icon"><Wallet size={25} /></div>
          <span className="wallet-overline">START WITH AN ALLOWANCE</span>
          <h2>Your money deserves a clearer view.</h2>
          <p>Add your allowance cycle to see what is available, record expenses, and follow your spending over time.</p>
          <Link to="/settings/allowance/new" className="btn btn-primary">Set up allowance <ChevronRight size={17} /></Link>
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
    ? "Over the allowance by"
    : summary.status === "ended" ? "Left at the end" : "Available balance";
  const balanceValue = formatMoney(Math.abs(summary.remainingCentavos));
  const paceText = {
    not_started: "Starts in " + summary.daysUntilStart + " day" + (summary.daysUntilStart === 1 ? "" : "s"),
    on_track: "You're on pace with your plan",
    above_pace: "Spending is above your planned daily pace",
    over_budget: "Over the allowance by " + formatMoney(-summary.remainingCentavos),
    ended: "This cycle has ended",
  }[summary.pace];

  return (
    <Page className="wallet-dashboard">
      <header className="wallet-header">
        <div className="wallet-header__copy">
          <span className="wallet-overline">YOUR MONEY / AT A GLANCE</span>
          <h1>{greeting()}{firstName ? ", " + firstName : ""}</h1>
          <p>{formatDate(today)} <span aria-hidden="true">·</span> A little more clarity, every day.</p>
        </div>
        <div className="wallet-header__avatar" aria-label="Gastador account"><LogoMark size={34} /></div>
      </header>

      {summary.status === "ended" && (
        <Banner
          tone="info"
          icon={CalendarClock}
          title={"Your cycle ended on " + formatDate(cycle.endDate)}
          action={<Link to="/settings/allowance/new" className="btn btn-primary btn-sm">Start next cycle</Link>}
        >
          Add your next allowance cycle to continue tracking your spending.
        </Banner>
      )}

      <div className="wallet-dashboard__grid">
        <div className="wallet-dashboard__primary">
          <section className="wallet-balance-card" aria-label="Available allowance balance">
            <div className="wallet-balance-card__art" aria-hidden="true">
              <span className="wallet-balance-card__orbit wallet-balance-card__orbit--one" />
              <span className="wallet-balance-card__orbit wallet-balance-card__orbit--two" />
              <span className="wallet-balance-card__light" />
            </div>
            <div className="wallet-balance-card__top">
              <div>
                <span className="wallet-balance-card__eyebrow">AVAILABLE TO SPEND</span>
                <span className="wallet-balance-card__period">{cycleLabel}</span>
              </div>
              <span className="wallet-balance-card__mark">₱</span>
            </div>
            <div className="wallet-balance-card__value">
              <span>{balanceLabel}</span>
              <strong className="num" data-testid="remaining">{balanceValue}</strong>
              <small className={isOver ? "is-over" : ""}><i />{paceText}</small>
            </div>
            <div className="wallet-balance-card__footer">
              <div><span>Allowance</span><strong className="num">{formatMoney(summary.spendableCentavos)}</strong></div>
              <div><span>Spent</span><strong className="num">{formatMoney(summary.spentCentavos)}</strong></div>
              <div><span>Days left</span><strong className="num">{summary.status === "ended" ? "0" : summary.daysRemaining}</strong></div>
            </div>
            <div className="wallet-balance-card__progress" aria-label={Math.round(usedPercent) + " percent of allowance used"}>
              <span style={{ width: usedPercent + "%" }} />
            </div>
          </section>

          <section className="wallet-quick-access" aria-label="Quick actions">
            <div className="wallet-section-heading">
              <div><span className="wallet-overline">QUICK ACCESS</span><h2>Make it happen.</h2></div>
            </div>
            <div className="wallet-quick-access__items">
              <QuickAction to="/snap" icon={ScanLine} label="Scan receipt" />
              <QuickAction to="/activity/new" icon={Plus} label="Add expense" />
              <QuickAction to="/activity" icon={History} label="Activity" />
              <QuickAction to="/settings/allowance" icon={Settings2} label="Allowance" />
            </div>
          </section>

          <section className="wallet-card-visual" aria-label="Current allowance cycle">
            <div className="wallet-card-visual__top">
              <div className="wallet-card-visual__brand"><LogoMark size={28} /><span>GASTADOR</span></div>
              <span className="wallet-card-visual__type">ALLOWANCE CARD</span>
            </div>
            <div className="wallet-card-visual__middle">
              <span>CURRENT CYCLE</span>
              <strong>{cycle.name}</strong>
              <small>{formatRange(cycle.startDate, cycle.endDate)}</small>
            </div>
            <div className="wallet-card-visual__bottom">
              <div><span>Cycle allowance</span><strong className="num">{formatMoney(cycle.allowanceCentavos)}</strong></div>
              <div className="wallet-card-visual__chip"><Clock3 size={15} /><span>{summary.status === "ended" ? "Ended" : summary.daysRemaining + " days left"}</span></div>
            </div>
            <span className="wallet-card-visual__glint" aria-hidden="true" />
          </section>
        </div>

        <div className="wallet-dashboard__secondary">
          <section className="wallet-panel wallet-analytics">
            <div className="wallet-section-heading">
              <div>
                <span className="wallet-overline">SPENDING ACTIVITY</span>
                <h2>Your money in motion.</h2>
                <p>How your recorded expenses move through this cycle.</p>
              </div>
              <span className="wallet-panel__icon"><ChartNoAxesColumn size={19} /></span>
            </div>
            <div className="wallet-analytics__stats">
              <div><span>Safe per day</span><strong className="num" data-testid="daily-limit">{summary.dailySafeLimitCentavos === null ? "—" : formatMoney(summary.dailySafeLimitCentavos)}</strong></div>
              <div><span>Allowance used</span><strong className="num">{Math.round(summary.percentUsed)}%</strong></div>
            </div>
            <SpendingChart transactions={inCycle} cycle={cycle} today={today} />
            <div className="wallet-analytics__bottom">
              <span>Budget {formatMoney(summary.spendableCentavos)}</span>
              <span>Remaining {formatMoney(Math.max(0, summary.remainingCentavos))}</span>
            </div>
          </section>

          <section className="wallet-panel wallet-transactions">
            <div className="wallet-section-heading">
              <div><span className="wallet-overline">THE LATEST</span><h2>Transactions.</h2></div>
              <Link to="/activity" className="wallet-view-all">See all <ArrowUpRight size={15} /></Link>
            </div>
            {recent.length === 0 ? (
              <div className="wallet-transactions__empty">
                <span><Wallet size={19} /></span>
                <p>No transactions yet.</p>
                <small>Your latest purchases will appear here.</small>
                <Link to="/activity/new">Add your first expense <ChevronRight size={14} /></Link>
              </div>
            ) : (
              <ul className="wallet-transactions__list">
                {recent.map((transaction) => (
                  <li key={transaction.id}>
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
        </div>
      </div>

      <div className="wallet-lower-grid">
        {categories.length > 0 && (
          <section className="wallet-panel wallet-categories">
            <div className="wallet-section-heading">
              <div><span className="wallet-overline">SPENDING BREAKDOWN</span><h2>Where it goes.</h2></div>
              <Link to="/insights" className="wallet-view-all">Insights <ArrowUpRight size={15} /></Link>
            </div>
            <ul className="wallet-category-list">
              {categories.map((category) => {
                const categoryName = categoryById.get(category.key)?.name ?? "Unknown";
                const share = ratioPercent(category.total, summary.spentCentavos);
                return (
                  <li key={category.key}>
                    <div className="wallet-category-list__row">
                      <CategoryIcon name={categoryName} size={19} />
                      <span>{categoryName}</span>
                      <strong className="num">{formatMoney(category.total)}</strong>
                    </div>
                    <div className="wallet-category-list__track">
                      <span style={{ width: Math.max(0, Math.min(100, share)) + "%" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {goals.length > 0 && (
          <section className="wallet-panel wallet-savings">
            <div className="wallet-section-heading">
              <div><span className="wallet-overline">SAVING TOWARD</span><h2>{goals[0].goal.name}.</h2></div>
              <span className="wallet-panel__icon"><PiggyBank size={19} /></span>
            </div>
            <div className="wallet-savings__value">
              <strong className="num">{formatMoney(goals[0].savedCentavos)}</strong>
              <span>of {formatMoney(goals[0].goal.targetCentavos)}</span>
            </div>
            <div className="wallet-savings__track"><span style={{ width: Math.max(0, Math.min(100, goals[0].percent)) + "%" }} /></div>
            <div className="wallet-savings__foot">
              <span>{Math.round(goals[0].percent)}% reached</span>
              <Link to="/settings/savings">View goal <ChevronRight size={14} /></Link>
            </div>
          </section>
        )}
        {alerts.length > 0 && (
          <section className="wallet-panel wallet-notes" aria-label="Spending notes">
            <div className="wallet-section-heading">
              <div><span className="wallet-overline">A QUICK NOTE</span><h2>Stay in the loop.</h2></div>
              <Info size={18} className="wallet-notes__icon" />
            </div>
            <ul>{alerts.slice(0, 3).map((alert) => <li key={alert.id}>{alert.text}</li>)}</ul>
          </section>
        )}
      </div>
    </Page>
  );
}
