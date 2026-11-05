import { Lock, PieChart } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useBilling } from "../app/BillingProvider";
import { useData } from "../app/DataProvider";
import { BarList, ColumnChart, DonutChart } from "../components/Charts";
import { Banner, EmptyState, ScreenSkeleton } from "../components/ui/Bits";
import { TextField } from "../components/ui/Fields";
import { Page, PageHeader, Section } from "../components/ui/PageHeader";
import { expensesInCycle } from "../domain/allowance";
import {
  addDays,
  daysInclusive,
  formatDate,
  formatRange,
} from "../domain/dates";
import {
  byCategory,
  byMethod,
  inRange,
  series,
  splurgeTotals,
  type Bucket,
} from "../domain/insights";
import { divRoundHalfUp, formatMoney } from "../domain/money";
import { methodLabel } from "../domain/types";

type Preset = "cycle" | "7" | "30" | "90" | "custom";

export default function Insights() {
  const { world, today, current, summary, categoryById } = useData();
  const billing = useBilling();
  const [preset, setPreset] = useState<Preset>(current ? "cycle" : "30");
  const [bucket, setBucket] = useState<Bucket>("day");
  const [custom, setCustom] = useState({
    from: addDays(today, -29),
    to: today,
  });

  const range = useMemo(() => {
    if (preset === "cycle" && current)
      return {
        from: current.cycle.startDate,
        to: current.cycle.endDate < today ? current.cycle.endDate : today,
      };
    if (preset === "custom") return custom;
    const days = preset === "7" ? 7 : preset === "90" ? 90 : 30;
    return { from: addDays(today, -(days - 1)), to: today };
  }, [preset, current, today, custom]);

  if (!world) return <ScreenSkeleton />;

  const days = range.from <= range.to ? daysInclusive(range.from, range.to) : 0;
  const tooLong = days > billing.insightsDays;
  const valid = days >= 1 && days <= 3660;
  const txs =
    valid && !tooLong ? inRange(world.transactions, range.from, range.to) : [];
  const total = txs.reduce((s, t) => s + t.amountCentavos, 0);
  const lastDay =
    preset === "cycle" && current && current.cycle.endDate > today
      ? today
      : range.to;
  const elapsed = valid
    ? Math.max(
        1,
        daysInclusive(range.from, lastDay < range.from ? range.from : lastDay),
      )
    : 1;
  const cats = byCategory(txs);
  const categoryChartData = cats.slice(0, 5).map((c) => ({
    label: categoryById.get(c.key)?.name ?? "Unknown",
    value: c.total,
  }));
  if (cats.length > 5) {
    categoryChartData.push({
      label: "Other",
      value: cats.slice(5).reduce((sum, c) => sum + c.total, 0),
    });
  }
  const methods = byMethod(txs);
  const splurge = splurgeTotals(txs);
  const chart =
    valid && !tooLong ? series(txs, range.from, range.to, bucket) : [];
  const label = (k: string) =>
    bucket === "month" ? k.slice(0, 7) : formatDate(k, false);
  const recent = world.cycles.slice(0, 6).reverse();

  return (
    <>
      <PageHeader
        title="Insights"
        subtitle={valid ? formatRange(range.from, range.to) : undefined}
      />
      <Page>
        <div
          className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
          role="group"
          aria-label="Time range"
        >
          {current && (
            <button
              type="button"
              className="chip"
              aria-pressed={preset === "cycle"}
              onClick={() => setPreset("cycle")}
            >
              This cycle
            </button>
          )}
          {(["7", "30", "90"] as const).map((p) => (
            <button
              key={p}
              type="button"
              className="chip"
              aria-pressed={preset === p}
              onClick={() => setPreset(p)}
            >
              Last {p} days
              {Number(p) > 31 && !billing.unlocked && billing.enforcement && (
                <Lock
                  size={14}
                  strokeWidth={1.75}
                  className="ml-1.5"
                  aria-label="Needs lifetime unlock"
                />
              )}
            </button>
          ))}
          <button
            type="button"
            className="chip"
            aria-pressed={preset === "custom"}
            onClick={() => setPreset("custom")}
          >
            Custom
          </button>
        </div>

        {preset === "custom" && (
          <div className="mb-2 grid grid-cols-2 gap-3">
            <TextField
              label="From"
              type="date"
              value={custom.from}
              max={custom.to}
              onChange={(e) => setCustom({ ...custom, from: e.target.value })}
            />
            <TextField
              label="To"
              type="date"
              value={custom.to}
              min={custom.from}
              max={today}
              onChange={(e) => setCustom({ ...custom, to: e.target.value })}
            />
          </div>
        )}

        {tooLong && (
          <Banner
            tone="info"
            icon={Lock}
            title={`Free Insights cover up to ${billing.insightsDays} days`}
            action={
              <Link to="/settings/unlock" className="btn btn-primary btn-sm">
                See lifetime unlock
              </Link>
            }
          >
            Pick a shorter range to keep going.
          </Banner>
        )}
        {!valid && !tooLong && (
          <Banner tone="warn">
            Choose a start date that is on or before the end date.
          </Banner>
        )}

        {valid && !tooLong && world.transactions.length === 0 && (
          <div>
            <EmptyState
              icon={PieChart}
              title="Insights appear after your first expense"
              action={
                <Link to="/activity/new" className="btn btn-primary">
                  Add an expense
                </Link>
              }
            >
              You will see where your allowance goes, by day, category, and
              payment method.
            </EmptyState>
          </div>
        )}

        {valid && !tooLong && world.transactions.length > 0 && (
          <div className="lg:grid lg:grid-cols-2 lg:gap-6">
            <div>
              <section
                className="mb-5 grid grid-cols-3 divide-x divide-line border-y border-line py-3"
                aria-label="Summary"
              >
                <div className="min-w-0 px-2 first:pl-0 sm:px-4">
                  <p className="text-xs text-muted">Spent</p>
                  <p className="num truncate text-base font-semibold sm:text-lg">
                    {formatMoney(total)}
                  </p>
                </div>
                <div className="min-w-0 px-2 sm:px-4">
                  <p className="text-xs text-muted">Per day</p>
                  <p className="num truncate text-base font-semibold sm:text-lg">
                    {formatMoney(divRoundHalfUp(total, elapsed))}
                  </p>
                </div>
                <div className="min-w-0 px-2 last:pr-0 sm:px-4">
                  <p className="text-xs text-muted">Top category</p>
                  <p className="truncate text-base font-semibold sm:text-lg">
                    {cats[0]
                      ? (categoryById.get(cats[0].key)?.name ?? "Unknown")
                      : "None"}
                  </p>
                </div>
              </section>

              <Section
                title="Over time"
                action={
                  <div
                    className="flex gap-1"
                    role="group"
                    aria-label="Group by"
                  >
                    {(["day", "week", "month"] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        className="chip !min-h-[40px] !px-3"
                        aria-pressed={bucket === b}
                        onClick={() => setBucket(b)}
                      >
                        {b === "day"
                          ? "Daily"
                          : b === "week"
                            ? "Weekly"
                            : "Monthly"}
                      </button>
                    ))}
                  </div>
                }
              >
                <div className="pt-1">
                  {total === 0 ? (
                    <p className="py-4 text-muted">
                      No spending in this range.
                    </p>
                  ) : (
                    <ColumnChart
                      title={`${bucket} spending`}
                      data={chart.map((c) => ({
                        label: label(c.key),
                        value: c.total,
                      }))}
                    />
                  )}
                </div>
              </Section>

              {splurge.count > 0 && (
                <Section title="Tagged splurges">
                  <div className="border-l-2 border-primary pl-4 py-1">
                    <p className="num text-lg font-semibold">
                      {formatMoney(splurge.total)}
                    </p>
                    <p className="text-sm text-muted">
                      {splurge.count} expense{splurge.count === 1 ? "" : "s"}{" "}
                      you tagged. These are labels you chose, nothing more.
                    </p>
                  </div>
                </Section>
              )}
            </div>

            <div>
              {cats.length > 0 && (
                <Section title="Spending breakdown">
                  <DonutChart
                    title="Spending by category"
                    data={categoryChartData}
                  />
                </Section>
              )}
              {preset === "cycle" && current && summary && (
                <div className="mb-6 border-l-2 border-primary bg-primary/5 px-4 py-3">
                  <p className="text-sm font-semibold">Current cycle budget</p>
                  <p className="mt-1 text-sm text-muted">
                    {Math.round(summary.percentUsed)}% used ·{" "}
                    {formatMoney(Math.max(0, summary.remainingCentavos))}{" "}
                    remaining
                  </p>
                </div>
              )}
              {methods.length > 0 && (
                <Section title="By payment method">
                  <div>
                    <BarList
                      title="Spending by payment method"
                      data={methods.map((m) => ({
                        label: methodLabel(m.key),
                        value: m.total,
                      }))}
                    />
                  </div>
                </Section>
              )}
              {recent.length >= 2 && (
                <Section title="Recent cycles">
                  <div>
                    <BarList
                      title="Spent per cycle"
                      data={recent.map((c) => ({
                        label: c.name,
                        value: expensesInCycle(c, world.transactions),
                      }))}
                    />
                  </div>
                </Section>
              )}
            </div>
          </div>
        )}
      </Page>
    </>
  );
}
