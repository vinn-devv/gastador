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

function HomeShortcut({
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
    <Link
      to={to}
      className="home-shortcut group min-w-0 text-left focus-visible:bg-soft"
    >
      <span className="home-shortcut__icon shrink-0">
        <Icon size={19} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-snug">
          {title}
        </span>
        <span className="hidden truncate text-xs text-muted sm:block">
          {detail}
        </span>
      </span>
      <ChevronRight
        size={17}
        className="ml-auto shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
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
    <header className="safe-top mx-auto flex max-w-[1440px] items-center justify-between px-4 pb-3 pt-5 md:px-8 xl:px-10">
      <div>
        <p className="text-sm text-muted">{formatDate(today)}</p>
        <h1>
          {greeting()}
          {name ? `, ${name}` : ""}
        </h1>
      </div>
      <LogoMark size={34} className="md:hidden" />
    </header>
  );

  if (!current || !summary) {
    return (
      <>
        {header}
        <Page>
          <div>
            <EmptyState
              icon={Wallet}
              title="Set up your allowance"
              action={
                <Link to="/settings/allowance/new" className="btn btn-primary">
                  Add allowance cycle
                </Link>
              }
            >
              Tell Gastador how much you get and when the next allowance
              arrives. It then shows what is left and a safe amount to spend
              each day.
            </EmptyState>
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
  const barTone = over ? "bad" : summary.percentUsed >= 90 ? "warn" : "mint";

  const paceText = {
    not_started: `Starts in ${summary.daysUntilStart} day${summary.daysUntilStart === 1 ? "" : "s"}`,
    on_track: "On pace with your plan",
    above_pace: "Spending is above the planned daily pace",
    over_budget: `Over the allowance by ${formatMoney(-summary.remainingCentavos)}`,
    ended: "This cycle has ended",
  }[summary.pace];

  return (
    <>
      {header}
      <Page>
        {summary.status === "ended" && (
          <Banner
            tone="info"
            icon={CalendarClock}
            title={`Your cycle ended on ${formatDate(cycle.endDate)}`}
            action={
              <Link
                to="/settings/allowance/new"
                className="btn btn-primary btn-sm"
              >
                Start next cycle
              </Link>
            }
          >
            Add your next allowance to see what is left and a daily amount
            again.
          </Banner>
        )}
        <section
          className="balance-panel mb-10"
          aria-label="Allowance balance"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.82fr)] lg:items-center lg:gap-10">
            <div>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-muted">
                  Allowance overview
                </p>
                <span className="rounded-full bg-soft px-3 py-1.5 text-xs font-medium text-primary">
                  {cycle.name.startsWith("Allowance from")
                    ? formatRange(cycle.startDate, cycle.endDate)
                    : cycle.name}
                </span>
              </div>
              <p className="text-sm font-semibold text-muted">
                {over
                  ? "Over the allowance by"
                  : summary.status === "ended"
                    ? "Left at the end"
                    : "Available to spend"}
              </p>
              <p
                key={summary.remainingCentavos}
                className="num metric-pop my-1 text-5xl font-semibold tracking-tight text-primary sm:text-6xl"
                data-testid="remaining"
              >
                {formatMoney(Math.abs(summary.remainingCentavos))}
              </p>
              <p className="mb-5 text-sm text-muted">{paceText}</p>
              <div className="mb-2">
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs text-muted">
                  <span>Budget used</span>
                  <span className="num font-semibold">
                    {Math.round(summary.percentUsed)}%
                  </span>
                </div>
                <ProgressBar
                  percent={summary.percentUsed}
                  tone={barTone}
                  label="Share of allowance spent"
                />
              </div>
              <dl className="mt-6 grid grid-cols-3 divide-x divide-line border-y border-line py-4">
                <div className="pr-2">
                  <dt className="text-xs text-muted">Budget</dt>
                  <dd className="num mt-1 truncate text-sm font-semibold sm:text-base">
                    {formatMoney(summary.spendableCentavos)}
                  </dd>
                </div>
                <div className="px-2">
                  <dt className="text-xs text-muted">Spent</dt>
                  <dd className="num mt-1 truncate text-sm font-semibold sm:text-base">
                    {formatMoney(summary.spentCentavos)}
                  </dd>
                </div>
                <div className="pl-2">
                  <dt className="text-xs text-muted">Remaining</dt>
                  <dd className="num mt-1 truncate text-sm font-semibold sm:text-base">
                    {formatMoney(Math.max(0, summary.remainingCentavos))}
                  </dd>
                </div>
              </dl>
              <dl className="mt-5 grid grid-cols-2 gap-4 border-b border-line pb-5">
                <div>
                  <dt className="text-sm text-muted">Safe to spend per day</dt>
                  <dd
                    key={summary.dailySafeLimitCentavos ?? "none"}
                    className="num metric-pop text-xl font-semibold sm:text-2xl"
                    data-testid="daily-limit"
                  >
                    {summary.dailySafeLimitCentavos === null
                      ? "Not applicable"
                      : formatMoney(summary.dailySafeLimitCentavos)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">
                    {summary.status === "upcoming"
                      ? "Cycle length"
                      : "Days left"}
                  </dt>
                  <dd
                    key={summary.status === "ended" ? 0 : summary.daysRemaining}
                    className="num metric-pop text-xl font-semibold sm:text-2xl"
                  >
                    {summary.status === "ended" ? "0" : summary.daysRemaining}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="mt-7 max-w-2xl border-t border-line pt-5">
              <p className="mb-1 text-sm font-semibold text-ink">
                Daily spending
              </p>
              <p className="mb-4 text-xs text-muted">
                Your pace through this allowance
              </p>
              <CycleStrip
                cycle={cycle}
                txs={inCycle}
                today={today}
                plannedDaily={summary.plannedDailyCentavos}
                onDark={false}
              />
              <p className="mt-4 text-xs leading-relaxed text-muted">
                Allowance {formatMoney(cycle.allowanceCentavos)}
                {cycle.carryoverCentavos > 0
                  ? ` · ${formatMoney(cycle.carryoverCentavos)} carried over`
                  : ""}
                {cycle.plannedSavingsCentavos > 0
                  ? ` · ${formatMoney(cycle.plannedSavingsCentavos)} set aside`
                  : ""}
              </p>
            </div>
          </div>
        </section>

        <section
          className="dashboard-section mb-10 border-b pb-6"
          aria-label="Quick actions"
        >
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <h2 className="text-base">Shortcuts</h2>
          </div>
          <div className="-mx-1 grid grid-cols-2 gap-x-4 sm:mx-0 sm:grid-cols-4 sm:gap-x-6">
            <HomeShortcut
              to="/snap"
              icon={ScanLine}
              title="Scan a receipt"
              detail="GCash, Maya or paper"
            />
            <HomeShortcut
              to="/activity/new"
              icon={Plus}
              title="Add an expense"
              detail="Enter it yourself"
            />
            <HomeShortcut
              to="/activity"
              icon={History}
              title="Activity"
              detail="View transactions"
            />
            <HomeShortcut
              to="/settings/allowance"
              icon={Settings2}
              title="Allowance"
              detail="Manage your cycle"
            />
          </div>
        </section>
        <div className="lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)] lg:items-start lg:gap-12">
          <div>
            {alerts.length > 0 && (
              <ul
                className={`mb-6 border-l-2 pl-3 ${alerts.some((a) => a.tone === "warn") ? "border-warn" : "border-primary"}`}
                aria-label="Notes"
              >
                {alerts.map((a) => (
                  <li
                    key={a.id}
                    className="flex gap-2.5 py-2 text-sm first:pt-0 last:pb-0"
                  >
                    <Info
                      size={17}
                      strokeWidth={1.8}
                      className={`mt-0.5 shrink-0 ${a.tone === "warn" ? "text-warn" : "text-primary"}`}
                      aria-hidden
                    />
                    <span>{a.text}</span>
                  </li>
                ))}
              </ul>
            )}
            <Section
              title="Recent activity"
              action={
                <Link
                  to="/activity"
                  className="text-sm font-semibold text-primary"
                >
                  View all
                </Link>
              }
            >
              {recent.length === 0 ? (
                <div className="border-y border-line py-6 text-muted">
                  Nothing recorded yet. Add an expense or snap a GCash, Maya, or
                  paper receipt.
                </div>
              ) : (
                <ul className="dashboard-list divide-y divide-line">
                  {recent.map((t) => (
                    <li key={t.id}>
                      <TransactionRow
                        tx={t}
                        categoryName={
                          categoryById.get(t.categoryId)?.name ?? "Unknown"
                        }
                        showDate
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
          <div>
            {categories.length > 0 && (
              <Section
                title="This cycle by category"
                action={
                  <Link
                    to="/insights"
                    className="text-sm font-semibold text-primary"
                  >
                    Insights
                  </Link>
                }
              >
                <ul className="dashboard-list divide-y divide-line">
                  {categories.map((c) => {
                    const name = categoryById.get(c.key)?.name ?? "Unknown";
                    return (
                      <li key={c.key} className="py-3 first:pt-0 last:pb-0">
                        <div className="mb-1.5 flex items-center gap-3">
                          <CategoryIcon name={name} size={18} />
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {name}
                          </span>
                          <span className="num text-sm font-semibold">
                            {formatMoney(c.total)}
                          </span>
                        </div>
                        <ProgressBar
                          percent={ratioPercent(c.total, summary.spentCentavos)}
                          label={`${name} share of spending`}
                        />
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}

            {goals.length > 0 && (
              <Section>
                <Link
                  to="/settings/savings"
                  className="flex min-h-[64px] items-center gap-3 border-y border-line px-1 py-3"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tealsoft text-teal">
                    <PiggyBank size={20} strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {goals[0].goal.name}
                    </span>
                    <span className="num block text-sm text-muted">
                      {formatMoney(goals[0].savedCentavos)} of{" "}
                      {formatMoney(goals[0].goal.targetCentavos)}
                    </span>
                  </span>
                  <ChevronRight
                    size={20}
                    strokeWidth={1.75}
                    className="text-muted"
                    aria-hidden
                  />
                </Link>
              </Section>
            )}
          </div>
        </div>
      </Page>
    </>
  );
}
