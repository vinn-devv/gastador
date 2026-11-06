import { ArrowUpRight, CalendarClock, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useData } from "../app/DataProvider";
import { CategoryIcon } from "../components/CategoryIcon";
import { LogoMark } from "../components/Logo";
import { Banner, ScreenSkeleton } from "../components/ui/Bits";
import { Page } from "../components/ui/PageHeader";
import { transactionsInCycle } from "../domain/allowance";
import { diffDays, formatDate, formatRange, manilaHour } from "../domain/dates";
import { byCategory } from "../domain/insights";
import { formatMoney, ratioPercent } from "../domain/money";

function greeting(): string {
  const hour = manilaHour();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function SpendingLine({
  transactions, cycle, today,
}: {
  transactions: { date: string; amountCentavos: number }[];
  cycle: { startDate: string; endDate: string };
  today: string;
}) {
  const elapsed = Math.max(1, Math.min(
    diffDays(cycle.startDate, today) + 1,
    diffDays(cycle.startDate, cycle.endDate) + 1,
  ));
  const values = Array.from({ length: 12 }, () => 0);
  transactions.forEach((transaction) => {
    const day = diffDays(cycle.startDate, transaction.date);
    if (day < 0 || day >= elapsed) return;
    values[Math.min(11, Math.floor((day / elapsed) * 12))] += transaction.amountCentavos;
  });
  if (!values.some(Boolean)) return null;

  const max = Math.max(...values, 1);
  const points = values.map((value, index) => ({ x: 12 + index * 55, y: 106 - (value / max) * 74 }));
  let line = "M " + points[0].x + " " + points[0].y;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i], b = points[i + 1];
    line += " Q " + a.x + " " + a.y + " " + ((a.x + b.x) / 2) + " " + ((a.y + b.y) / 2);
  }
  line += " T " + points[points.length - 1].x + " " + points[points.length - 1].y;
  const last = points[points.length - 1];

  return (
    <figure className="home-activity__chart">
      <svg viewBox="0 0 620 132" role="img" aria-label="Daily spending during this allowance cycle">
        <defs>
          <linearGradient id="home-line-gradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#398BFF" />
            <stop offset="55%" stopColor="#69B2FF" />
            <stop offset="100%" stopColor="#C3E2FF" />
          </linearGradient>
          <linearGradient id="home-area-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#398BFF" stopOpacity=".18" />
            <stop offset="100%" stopColor="#398BFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[28, 66, 104].map((y) => <line key={y} x1="8" x2="612" y1={y} y2={y} className="home-activity__guide" />)}
        <path d={line + " L " + last.x + " 120 L 12 120 Z"} fill="url(#home-area-gradient)" />
        <path d={line} fill="none" stroke="url(#home-line-gradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="home-activity__stroke" />
        <circle cx={last.x} cy={last.y} r="11" className="home-activity__pulse" />
        <circle cx={last.x} cy={last.y} r="4" className="home-activity__point" />
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
  if (error) return <Page><Banner tone="bad" title="Could not open your data">{error.message}</Banner></Page>;
  if (!world) return <ScreenSkeleton />;

  const firstName = world.settings.displayName.trim().split(/\s+/)[0];
  if (!current || !summary) {
    return (
      <Page className="home-calm">
        <header className="home-calm__header">
          <div>
            <h1>{greeting()}{firstName ? ", " + firstName : ""}</h1>
          </div>
          <LogoMark size={40} />
        </header>
        <section className="home-setup">
          <span className="home-calm__eyebrow">A CLEAR START</span>
          <h2>Give every peso<br />somewhere to go.</h2>
          <p>Set your allowance once. Then Gastador can help you see what is available and how your spending changes.</p>
          <Link to="/settings/allowance/new" className="home-setup__link">Set up your allowance <ArrowUpRight size={17} /></Link>
          <span className="home-setup__halo" aria-hidden="true" />
        </section>
      </Page>
    );
  }

  const cycle = current.cycle;
  const inCycle = transactionsInCycle(cycle, world.transactions);
  const categories = byCategory(inCycle).slice(0, 3);
  const percentUsed = Math.max(0, Math.min(100, summary.percentUsed));
  const circumference = 2 * Math.PI * 108;
  const offset = circumference * (1 - percentUsed / 100);
  const remaining = summary.remainingCentavos;
  const cycleLabel = cycle.name.startsWith("Allowance from")
    ? formatRange(cycle.startDate, cycle.endDate)
    : cycle.name;
  const paceText = remaining < 0
    ? "You've gone over this allowance"
    : summary.pace === "on_track"
      ? "You're on track"
      : summary.pace === "above_pace"
        ? "Spending is above your daily pace"
        : summary.pace === "not_started"
          ? "Your allowance cycle hasn't started"
          : summary.pace === "ended"
            ? "This cycle has ended"
            : "Keep an eye on your spending";

  return (
    <Page className="home-calm">
      <header className="home-calm__header">
        <div>
          <h1>{greeting()}{firstName ? ", " + firstName : ""}</h1>
        </div>
        <div className="home-calm__brand" aria-label="Gastador"><LogoMark size={35} /></div>
      </header>

      {summary.status === "ended" && (
        <div className="home-calm__cycle-note">
          <CalendarClock size={15} />
          <span>Your allowance cycle has ended.</span>
          <Link to="/settings/allowance/new">Set a new cycle <ChevronRight size={14} /></Link>
        </div>
      )}

      <section className="home-balance" aria-label="Available allowance balance">
        <div className="home-balance__ambient" aria-hidden="true">
          <span className="home-balance__ambient-orb home-balance__ambient-orb--one" />
          <span className="home-balance__ambient-orb home-balance__ambient-orb--two" />
        </div>
        <div className="home-balance__ring-wrap">
          <svg className="home-balance__ring" viewBox="0 0 240 240" role="img" aria-label={Math.round(percentUsed) + " percent of allowance used"}>
            <defs>
              <linearGradient id="home-balance-ring-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#398BFF" />
                <stop offset="55%" stopColor="#77BBFF" />
                <stop offset="100%" stopColor="#D1E9FF" />
              </linearGradient>
              <filter id="home-balance-ring-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <circle className="home-balance__ring-track" cx="120" cy="120" r="108" />
            <circle
              className="home-balance__ring-progress"
              cx="120" cy="120" r="108"
              stroke="url(#home-balance-ring-gradient)"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              filter="url(#home-balance-ring-glow)"
            />
          </svg>
          <div className="home-balance__center">
            <span>{remaining < 0 ? "OVER ALLOWANCE" : "AVAILABLE BALANCE"}</span>
            <strong className="num" data-testid="remaining">{formatMoney(Math.abs(remaining))}</strong>
            <small>{remaining < 0 ? "amount over" : "to spend"}</small>
          </div>
          <span className="home-balance__orbit-dot" aria-hidden="true" />
        </div>
        <div className="home-balance__status">
          <span className={remaining < 0 ? "is-over" : ""} />
          {paceText}
        </div>
        <div className="home-balance__cycle">
          <span>{cycleLabel}</span>
          <span className="home-balance__separator" />
          <span>{summary.status === "ended" ? "Cycle complete" : summary.daysRemaining + " days left"}</span>
        </div>
      </section>

      <section className="home-summary" aria-label="Allowance summary">
        <div><span>Allowance</span><strong className="num">{formatMoney(summary.spendableCentavos)}</strong></div>
        <div><span>Spent</span><strong className="num">{formatMoney(summary.spentCentavos)}</strong></div>
        <div>
          <span>Safe per day</span>
          <strong className="num" data-testid="daily-limit">{summary.dailySafeLimitCentavos === null ? "—" : formatMoney(summary.dailySafeLimitCentavos)}</strong>
        </div>
      </section>

      <section className="home-activity" aria-label="Activity overview">
        <div className="home-section-heading">
          <div><span className="home-calm__eyebrow">YOUR MONEY, IN MOTION</span><h2>Activity Overview</h2></div>
          <Link to="/insights">This cycle <ArrowUpRight size={14} /></Link>
        </div>
        {inCycle.length > 0 ? (
          <SpendingLine transactions={inCycle} cycle={cycle} today={today} />
        ) : (
          <div className="home-activity__empty">
            <p>No activity yet.</p>
            <span>Your spending trend will appear here after your first expense.</span>
            <Link to="/activity/new">Add your first expense <ArrowUpRight size={14} /></Link>
          </div>
        )}
      </section>

      {categories.length > 0 && (
        <section className="home-categories" aria-label="Top spending categories">
          <div className="home-section-heading">
            <div><span className="home-calm__eyebrow">SPENDING BREAKDOWN</span><h2>Categories</h2></div>
            <Link to="/insights">See all <ArrowUpRight size={14} /></Link>
          </div>
          <ul className="home-categories__list">
            {categories.map((category) => {
              const name = categoryById.get(category.key)?.name ?? "Unknown";
              const share = ratioPercent(category.total, summary.spentCentavos);
              return (
                <li key={category.key}>
                  <div className="home-categories__row">
                    <span className="home-categories__icon"><CategoryIcon name={name} size={17} /></span>
                    <span className="home-categories__name">{name}</span>
                    <strong className="num">{formatMoney(category.total)}</strong>
                    <small>{Math.round(share)}%</small>
                  </div>
                  <div className="home-categories__track"><span style={{ width: Math.max(0, Math.min(100, share)) + "%" }} /></div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Page>
  );
}
