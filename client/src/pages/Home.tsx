import {
  CalendarClock,
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
import { CycleStrip } from "../components/CycleStrip";
import { TransactionRow } from "../components/TransactionRow";
import {
  Banner,
  EmptyState,
  ProgressBar,
  ScreenSkeleton,
} from "../components/ui/Bits";
import { Page, Section } from "../components/ui/PageHeader";
import { computeAlerts } from "../domain/alerts";
import { transactionsInCycle } from "../domain/allowance";
import {
  formatDate,
  formatRange,
  manilaHour,
  manilaHourMinute,
} from "../domain/dates";
import { byCategory } from "../domain/insights";
import { formatMoney, ratioPercent } from "../domain/money";
import { goalProgress } from "../domain/savings";

function greeting(): string {
  const h = manilaHour();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function QuickAction({
  to,
  icon: Icon,
  title,
  detail,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <Link to={to} className="dash-action">
      <span className="dash-action__icon">
        <Icon size={19} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="dash-action__copy">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ChevronRight size={16} className="dash-action__chevron" aria-hidden />
    </Link>
  );
}

export default function Home() {
  const { world, error, today, current, summary, categoryById } = useData();

  const alerts = useMemo(
    () =>
      world && current && summary
        ? computeAlerts({
            cycle: current.cycle,
            summary,
            prefs: world.settings.alerts,
            limits: world.limits,
            categories: world.categories,
            transactions: world.transactions,
            today,
            nowHourMinute: manilaHourMinute(),
          })
        : [],
    [world, current, summary, today],
  );

  if (error)
    return (
      <Page>
        <Banner tone="bad" title="Could not open your data">
          {error.message}
        </Banner>
      </Page>
    );
  if (!world) return <ScreenSkeleton />;

  const name = world.settings.displayName.split(" ")[0];
  const header = (
    <header className="dash-header safe-top">
      <div className="dash-header__identity">
        <span className="dash-header__overline">GASTADOR / OVERVIEW</span>
        <h1>{greeting()}{name ? ", " + name : ""}</h1>
        <p>{formatDate(today)} <span aria-hidden="true">·</span> Your money, in focus.</p>
      </div>
      <div className="dash-header__brand">
        <LogoMark size={42} />
      </div>
    </header>
  );

  if (!current || !summary) {
    return (
      <>
        {header}
        <Page className="dash-page">
          <div className="dash-empty">
            <div className="dash-empty__icon"><Wallet size={25} /></div>
            <div>
              <span className="dash-section-kicker">LET'S GET STARTED</span>
              <h2>Give your allowance a plan.</h2>
              <p>Set your allowance cycle and Gastador will help you understand what is available, what is safe to spend, and how your money is moving.</p>
              <Link to="/settings/allowance/new" className="btn btn-primary">Set up allowance <ChevronRight size={17} /></Link>
            </div>
          </div>
        </Page>
      </>
    );
  }

  const { cycle } = current;
  const inCycle = transactionsInCycle(cycle, world.transactions);
  const recent = world.transactions.slice(0, 5);
  const categories = byCategory(inCycle).slice(0, 4);
  const goals = world.goals.map((g) =>
    goalProgress(g, world.contributions, today),
  );
  const over = summary.remainingCentavos < 0;
  const percentUsed = Math.min(100, Math.max(0, summary.percentUsed));
  const ringCircumference = 2 * Math.PI * 42;
  const ringOffset = ringCircumference * (1 - percentUsed / 100);
  const barTone = over ? "bad" : summary.percentUsed >= 90 ? "warn" : "mint";

  const paceText = {
    not_started: "Starts in " + summary.daysUntilStart + " day" + (summary.daysUntilStart === 1 ? "" : "s"),
    on_track: "You're on pace with your plan",
    above_pace: "Spending is above your planned daily pace",
    over_budget: "Over the allowance by " + formatMoney(-summary.remainingCentavos),
    ended: "This cycle has ended",
  }[summary.pace];

  const cycleLabel = cycle.name.startsWith("Allowance from")
    ? formatRange(cycle.startDate, cycle.endDate)
    : cycle.name;

  return (
    <>
      {header}
      <Page className="dash-page">
        {summary.status === "ended" && (
          <Banner
            tone="info"
            icon={CalendarClock}
            title={"Your cycle ended on " + formatDate(cycle.endDate)}
            action={
              <Link to="/settings/allowance/new" className="btn btn-primary btn-sm">
                Start next cycle
              </Link>
            }
          >
            Add your next allowance to see what is left and a daily amount again.
          </Banner>
        )}

        <section className="dash-top-grid" aria-label="Allowance overview">
          <div className="dash-balance">
            <div className="dash-balance__shine" aria-hidden="true" />
            <div className="dash-balance__top">
              <div>
                <span className="dash-eyebrow">YOUR ALLOWANCE</span>
                <span className="dash-balance__period">{cycleLabel}</span>
              </div>
              <span className="dash-balance__symbol" aria-hidden="true">₱</span>
            </div>

            <div className="dash-balance__main">
              <span className="dash-balance__label">
                {over ? "Over the allowance by" : summary.status === "ended" ? "Left at the end" : "Available to spend"}
              </span>
              <strong className="dash-balance__amount num" data-testid="remaining">
                {formatMoney(Math.abs(summary.remainingCentavos))}
              </strong>
              <span className={"dash-balance__status" + (over ? " is-over" : "")}>
                <span className="dash-balance__status-dot" />
                {paceText}
              </span>
            </div>

            <div className="dash-balance__progress">
              <div className="dash-balance__progress-label">
                <span>Allowance used</span>
                <strong className="num">{Math.round(summary.percentUsed)}%</strong>
              </div>
              <div className="dash-balance__track" role="progressbar" aria-label="Allowance used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percentUsed)}>
                <span style={{ width: String(percentUsed) + "%" }} />
              </div>
            </div>

            <div className="dash-balance__stats">
              <div>
                <span>Budget</span>
                <strong className="num">{formatMoney(summary.spendableCentavos)}</strong>
              </div>
              <div>
                <span>Spent</span>
                <strong className="num">{formatMoney(summary.spentCentavos)}</strong>
              </div>
              <div>
                <span>Remaining</span>
                <strong className="num">{formatMoney(Math.max(0, summary.remainingCentavos))}</strong>
              </div>
            </div>
          </div>

          <aside className="dash-guide">
            <div className="dash-card-heading">
              <div>
                <span className="dash-section-kicker">YOUR DAILY GUIDE</span>
                <h2>Spend with confidence.</h2>
              </div>
              <span className="dash-guide__icon"><Wallet size={18} /></span>
            </div>
            <div className="dash-guide__center">
              <div className="dash-guide__ring">
                <svg viewBox="0 0 100 100" role="img" aria-label={Math.round(percentUsed) + " percent of allowance used"}>
                  <circle cx="50" cy="50" r="42" className="dash-guide__ring-track" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="dash-guide__ring-value"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div>
                  <strong className="num">{Math.round(summary.percentUsed)}%</strong>
                  <span>used</span>
                </div>
              </div>
              <div className="dash-guide__daily">
                <span>Safe to spend per day</span>
                <strong className="num" data-testid="daily-limit">
                  {summary.dailySafeLimitCentavos === null
                    ? "Not applicable"
                    : formatMoney(summary.dailySafeLimitCentavos)}
                </strong>
                <small>{summary.status === "upcoming" ? "Your cycle hasn't started yet" : "A daily pace based on what's left"}</small>
              </div>
            </div>
            <div className="dash-guide__footer">
              <div>
                <span>{summary.status === "upcoming" ? "Cycle length" : "Days left"}</span>
                <strong className="num">{summary.status === "ended" ? "0" : summary.daysRemaining}</strong>
              </div>
              <Link to="/settings/allowance" aria-label="Manage allowance">
                Manage allowance <ChevronRight size={15} />
              </Link>
            </div>
          </aside>
        </section>

        <section className="dash-actions" aria-label="Quick actions">
          <div className="dash-actions__label">
            <span className="dash-section-kicker">QUICK ACCESS</span>
            <h2>Make a move</h2>
          </div>
          <div className="dash-actions__items">
            <QuickAction to="/snap" icon={ScanLine} title="Scan receipt" detail="Capture a purchase" />
            <QuickAction to="/activity/new" icon={Plus} title="Add expense" detail="Log it manually" />
            <QuickAction to="/activity" icon={History} title="All activity" detail="See your spending" />
            <QuickAction to="/settings/allowance" icon={Settings2} title="Allowance" detail="Adjust your cycle" />
          </div>
        </section>

        {alerts.length > 0 && (
          <ul className="dash-alerts" aria-label="Spending notes">
            {alerts.map((a) => (
              <li key={a.id} className={a.tone === "warn" ? "is-warn" : ""}>
                <Info size={17} aria-hidden />
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="dash-insights-grid">
          <section className="dash-panel dash-spending" aria-label="Daily spending">
            <div className="dash-card-heading">
              <div>
                <span className="dash-section-kicker">SPENDING RHYTHM</span>
                <h2>See how your money moves.</h2>
                <p>Your daily spending through this allowance cycle.</p>
              </div>
              <span className="dash-panel__badge">This cycle</span>
            </div>
            <CycleStrip
              cycle={cycle}
              txs={inCycle}
              today={today}
              plannedDaily={summary.plannedDailyCentavos}
              onDark={false}
            />
            <div className="dash-spending__legend">
              <span><i className="is-primary" /> Within daily plan</span>
              <span><i className="is-warn" /> Above daily plan</span>
              <span><i className="is-line" /> Planned pace</span>
            </div>
            <div className="dash-spending__foot">
              <span>Allowance {formatMoney(cycle.allowanceCentavos)}</span>
              {cycle.carryoverCentavos > 0 && <span>{formatMoney(cycle.carryoverCentavos)} carried over</span>}
              {cycle.plannedSavingsCentavos > 0 && <span>{formatMoney(cycle.plannedSavingsCentavos)} set aside</span>}
            </div>
          </section>

          <section className="dash-panel dash-categories">
            <div className="dash-card-heading">
              <div>
                <span className="dash-section-kicker">WHERE IT GOES</span>
                <h2>Spending by category.</h2>
              </div>
              <Link to="/insights" className="dash-text-link">Insights <ChevronRight size={15} /></Link>
            </div>
            {categories.length === 0 ? (
              <div className="dash-muted-empty">Your category breakdown will appear after you record an expense.</div>
            ) : (
              <ul className="dash-category-list">
                {categories.map((c) => {
                  const categoryName = categoryById.get(c.key)?.name ?? "Unknown";
                  const share = ratioPercent(c.total, summary.spentCentavos);
                  return (
                    <li key={c.key}>
                      <div className="dash-category-row">
                        <CategoryIcon name={categoryName} size={20} />
                        <span className="dash-category-row__name">{categoryName}</span>
                        <strong className="num">{formatMoney(c.total)}</strong>
                      </div>
                      <div className="dash-category-track">
                        <span style={{ width: String(Math.min(100, Math.max(0, share))) + "%" }} />
                      </div>
                      <small>{Math.round(share)}% of recorded spending</small>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="dash-lower-grid">
          <section className="dash-panel dash-activity">
            <div className="dash-card-heading">
              <div>
                <span className="dash-section-kicker">THE LATEST</span>
                <h2>Recent activity.</h2>
                <p>Your latest recorded expenses.</p>
              </div>
              <Link to="/activity" className="dash-text-link">View all <ChevronRight size={15} /></Link>
            </div>
            {recent.length === 0 ? (
              <div className="dash-muted-empty">
                Nothing recorded yet. Add an expense or scan a GCash, Maya, or paper receipt.
                <Link to="/activity/new">Add your first expense <ChevronRight size={15} /></Link>
              </div>
            ) : (
              <ul className="dash-transaction-list">
                {recent.map((t) => (
                  <li key={t.id}>
                    <TransactionRow
                      tx={t}
                      categoryName={categoryById.get(t.categoryId)?.name ?? "Unknown"}
                      showDate
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="dash-side-stack">
            {goals.length > 0 && (
              <section className="dash-panel dash-goal">
                <div className="dash-card-heading">
                  <div>
                    <span className="dash-section-kicker">SAVING TOWARD</span>
                    <h2>{goals[0].goal.name}</h2>
                  </div>
                  <span className="dash-goal__icon"><PiggyBank size={19} /></span>
                </div>
                <div className="dash-goal__amounts">
                  <strong className="num">{formatMoney(goals[0].savedCentavos)}</strong>
                  <span>of {formatMoney(goals[0].goal.targetCentavos)}</span>
                </div>
                <ProgressBar percent={goals[0].percent} label="Savings goal progress" />
                <div className="dash-goal__foot">
                  <span>{Math.round(goals[0].percent)}% reached</span>
                  <Link to="/settings/savings">View goal <ChevronRight size={14} /></Link>
                </div>
              </section>
            )}

            <section className="dash-note">
              <div className="dash-note__symbol">₱</div>
              <div>
                <span className="dash-section-kicker">A SMALL REMINDER</span>
                <p>Every expense tells a story. Keep track, stay intentional, and make your allowance stretch.</p>
              </div>
            </section>
          </aside>
        </div>
      </Page>
    </>
  );
}
