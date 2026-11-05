import {
  BadgeCheck,
  ChartNoAxesColumn,
  CheckCircle2,
  Infinity as InfinityIcon,
  PiggyBank,
  ScanLine,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useBilling } from "../../app/BillingProvider";
import { Page, PageHeader, Section } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { FREE_LIMITS } from "../../billing/features";

const BENEFITS = [
  {
    icon: ScanLine,
    title: "Unlimited Snap receipt imports",
    body: `Scan GCash receipts, Maya screenshots, and paper receipts without limits. Free tier is capped at ${FREE_LIMITS.snapImportsPerCycle} imports per cycle.`,
    prototypeTag: "Unlimited in prototype",
  },
  {
    icon: ChartNoAxesColumn,
    title: "Full historical Insights & analytics",
    body: `Analyze spending over any custom period across multiple allowance cycles. Free tier covers up to ${FREE_LIMITS.insightsMaxDays} days.`,
    prototypeTag: "Multi-year unlocked",
  },
  {
    icon: PiggyBank,
    title: "Unlimited savings goals",
    body: `Create and track emergency funds, tuition goals, gadgets, and projects without caps. Free tier is limited to ${FREE_LIMITS.savingsGoals} goals.`,
    prototypeTag: "Unlimited in prototype",
  },
  {
    icon: InfinityIcon,
    title: "One-time unlock — keep it forever",
    body: "Single payment of ₱99. No recurring fees, no subscription traps, no ads, loans, or third-party trackers.",
    prototypeTag: "₱99 one-time",
  },
];

export default function Unlock() {
  const billing = useBilling();
  const toast = useToast();

  const toggleMode = (enable: boolean) => {
    billing.setPrototypeMode(enable);
    toast(
      enable
        ? "₱99 Prototype Access enabled: all features unlocked!"
        : "Free Tier mode active: testing free limits.",
    );
  };

  return (
    <>
      <PageHeader title="₱99 Plan & Prototype" back="/settings" />
      <Page className="max-w-2xl md:mx-0">
        {/* Prototype status banner */}
        <div className="mb-6 rounded-lg border border-primary/25 bg-soft p-4 text-ink">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-onprimary">
              <Sparkles size={18} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-primary">
                  Prototype Access Mode
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {billing.prototypeMode
                    ? "Active (Unlocked)"
                    : "Free Tier (Testing limits)"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                Explore every feature included in the ₱99 plan without requiring
                real payment or collecting billing data. You can toggle between
                tiers below to test both experiences.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleMode(!billing.prototypeMode)}
                  className="btn btn-sm btn-primary inline-flex items-center gap-1.5"
                >
                  {billing.prototypeMode ? (
                    <>
                      <ToggleRight size={18} aria-hidden /> Switch to Free Tier
                      (Test limits)
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={18} aria-hidden /> Activate ₱99
                      Prototype Mode
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Card */}
        <section className="mb-6 rounded-md bg-navy p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">
              Gastador Premium
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
              <ShieldCheck size={14} aria-hidden /> Offline-first
            </span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <p className="num text-4xl font-bold tracking-tight">₱99</p>
            <span className="text-sm text-white/75">one-time payment</span>
          </div>
          <p className="text-sm text-white/85">
            Full access to unlimited snap imports, multi-cycle insights, and
            unlimited savings goals. No subscriptions, renewals, or ads.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {billing.unlocked ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-navy">
                <BadgeCheck size={16} aria-hidden /> Unlocked for Testing
                (Prototype Mode)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                Free tier limits applied
              </span>
            )}
          </div>
        </section>

        {/* Feature comparison / What you get */}
        <Section title="Included in the ₱99 Plan">
          <ul className="card divide-y divide-line">
            {BENEFITS.map(({ icon: Icon, title, body, prototypeTag }) => (
              <li key={title} className="flex gap-3.5 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-primary">
                  <Icon size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-medium text-ink">{title}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2 py-0.5 text-xs font-semibold text-primary">
                      <CheckCircle2 size={12} aria-hidden /> {prototypeTag}
                    </span>
                  </div>
                  <span className="mt-1 block text-sm text-muted">{body}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="hint flex items-start gap-2">
            <ShieldOff size={16} className="mt-0.5 shrink-0" aria-hidden />{" "}
            Manual tracking, offline backups, CSV export, and all local data
            remain 100% free forever.
          </p>
        </Section>

        {/* Prototype action controls */}
        <div className="space-y-3 pt-2">
          {billing.prototypeMode ? (
            <div className="card space-y-3 p-4">
              <p className="text-sm font-medium text-ink">
                Interactive Prototype Controls
              </p>
              <p className="text-xs text-muted">
                You are currently in ₱99 Prototype Access Mode. You can freely
                use all premium features across the app:
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <a
                  href="/snap"
                  className="btn btn-secondary btn-sm justify-start"
                >
                  <ScanLine size={16} aria-hidden /> Test Unlimited Snap
                </a>
                <a
                  href="/insights"
                  className="btn btn-secondary btn-sm justify-start"
                >
                  <ChartNoAxesColumn size={16} aria-hidden /> Test Full Insights
                </a>
              </div>
              <button
                type="button"
                className="btn btn-secondary w-full text-sm"
                onClick={() => toggleMode(false)}
              >
                Simulate Free Tier (Test 10-snap & 2-goal limits)
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => toggleMode(true)}
            >
              <Sparkles size={18} aria-hidden /> Unlock ₱99 Plan (Prototype
              Access)
            </button>
          )}

          <p className="text-center text-xs text-muted">
            Prototype demonstration only. Google Play Billing integration
            architecture is preserved for production releases.
          </p>
        </div>
      </Page>
    </>
  );
}
