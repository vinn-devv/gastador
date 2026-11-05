import {
  ArrowRight,
  Camera,
  DatabaseBackup,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { RestorePanel } from "../components/RestorePanel";
import { LogoMark } from "../components/Logo";
import { Banner } from "../components/ui/Bits";
import { ChipGroup, MoneyField, TextField } from "../components/ui/Fields";
import { useToast } from "../components/ui/Toast";
import { createCycle, updateSettings } from "../data/repo";
import {
  endDateFromNextAllowance,
  nextAllowanceDate,
} from "../domain/allowance";
import { addDays, formatDate, isValidDate, manilaToday } from "../domain/dates";
import { divFloor, formatMoney, parseMoney } from "../domain/money";
import type { Frequency } from "../domain/types";
import { ValidationError } from "../domain/validation";
import { useData } from "../app/DataProvider";

const FREQ: { value: Frequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

export default function Onboarding() {
  const { world } = useData();
  const toast = useToast();
  const [step, setStep] = useState<"welcome" | "allowance" | "restore">(
    "welcome",
  );
  const start0 = manilaToday();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("biweekly");
  const [start, setStart] = useState(start0);
  const [next, setNext] = useState(
    nextAllowanceDate("biweekly", start0) ?? addDays(start0, 14),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const cents = parseMoney(amount);
  const end = isValidDate(next) ? endDateFromNextAllowance(next) : "";
  const days =
    isValidDate(start) && end && end >= start
      ? Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1
      : 0;

  function pickFrequency(f: Frequency) {
    setFrequency(f);
    const n = nextAllowanceDate(f, start);
    if (n) setNext(n);
  }

  async function finish(e: FormEvent) {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (cents === null)
      found.allowance = "Enter your allowance, like 2000 or 1,500.50.";
    if (!isValidDate(start)) found.startDate = "Choose a start date.";
    if (!isValidDate(next))
      found.endDate = "Choose when your next allowance arrives.";
    setErrors(found);
    if (Object.keys(found).length || cents === null) return;
    setBusy(true);
    try {
      await createCycle({
        name: `Allowance from ${formatDate(start, false)}`,
        frequency,
        startDate: start,
        endDate: endDateFromNextAllowance(next),
        allowanceCentavos: cents,
        plannedSavingsCentavos: 0,
      });
      await updateSettings({
        displayName: name.trim(),
        onboardingCompleted: true,
      });
      toast("You are all set.");
    } catch (err) {
      setErrors(
        err instanceof ValidationError
          ? err.fields
          : { form: "Could not save. Please try again." },
      );
    } finally {
      setBusy(false);
    }
  }

  if (step === "restore") {
    return (
      <div className="mx-auto min-h-dvh max-w-xl px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="btn btn-ghost -ml-3 mb-4"
          onClick={() => setStep("welcome")}
        >
          Back
        </button>
        <h1 className="mb-1">Bring your data over</h1>
        <p className="mb-5 text-muted">
          Restore a Gastador backup file, or import from the old online version.
        </p>
        <RestorePanel
          onDone={async () => {
            await updateSettings({ onboardingCompleted: true });
          }}
        />
      </div>
    );
  }

  if (step === "allowance") {
    return (
      <div className="mx-auto min-h-dvh max-w-xl pt-[max(1.5rem,env(safe-area-inset-top))]">
        <form onSubmit={finish} noValidate>
          <div className="px-5 pb-4">
            <button
              type="button"
              className="btn btn-ghost -ml-3 mb-2"
              onClick={() => setStep("welcome")}
            >
              Back
            </button>
            <h1 className="mb-1">Your allowance</h1>
            <p className="mb-5 text-muted">
              You can change any of this later in Settings.
            </p>
            {errors.form && <Banner tone="bad">{errors.form}</Banner>}
            <MoneyField
              large
              label="How much do you get each time?"
              value={amount}
              onChange={setAmount}
              error={errors.allowance}
              autoFocus
            />
            <ChipGroup
              label="How often?"
              options={FREQ}
              value={frequency}
              onChange={pickFrequency}
            />
            <div className="grid gap-x-3 sm:grid-cols-2">
              <TextField
                label="Starts on"
                type="date"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  if (isValidDate(e.target.value)) {
                    const n = nextAllowanceDate(frequency, e.target.value);
                    if (n) setNext(n);
                  }
                }}
                error={errors.startDate}
              />
              <TextField
                label="Next allowance arrives"
                type="date"
                value={next}
                min={addDays(isValidDate(start) ? start : start0, 1)}
                onChange={(e) => {
                  setNext(e.target.value);
                  setFrequency("custom");
                }}
                error={errors.endDate}
              />
            </div>
            {cents !== null && days > 0 && (
              <p className="card p-4 text-sm" aria-live="polite">
                That is <span className="num font-semibold">{days} days</span>,
                so about{" "}
                <span className="num font-semibold">
                  {formatMoney(divFloor(cents, days))}
                </span>{" "}
                a day to spend.
              </p>
            )}
            <TextField
              label="What should we call you? (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="given-name"
              fieldClassName="mt-4"
            />
          </div>
          <div className="action-bar">
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={busy}
            >
              {busy ? "Setting up…" : "Start tracking"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="onboarding-welcome mx-auto flex min-h-dvh max-w-xl flex-col px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mb-5 flex items-center gap-3">
        <LogoMark size={42} />
        <span className="text-xl font-semibold tracking-tight">Gastador</span>
      </div>
      <div
        className="onboarding-wallet my-4 flex min-h-[220px] items-center justify-center rounded-2xl sm:min-h-[260px]"
        aria-hidden="true"
      >
        <div className="relative flex h-36 w-52 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-xl sm:h-40 sm:w-60">
          <div className="absolute inset-x-0 top-5 h-px bg-white/15" />
          <div className="absolute bottom-5 left-5 h-8 w-12 rounded-md bg-white/15" />
          <div className="absolute right-0 top-1/2 flex h-12 w-10 -translate-y-1/2 items-center justify-center rounded-l-lg bg-white text-primary">
            <span className="h-2 w-2 rounded-full bg-primary/35" />
          </div>
          <WalletCards
            className="-translate-x-3 text-white/90"
            size={52}
            strokeWidth={1.35}
          />
        </div>
      </div>
      <p className="mb-2 text-sm font-medium text-white/70">
        A clearer way to manage your allowance
      </p>
      <h1 className="mb-3 max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        Make every peso feel more in control.
      </h1>
      <p className="mb-7 max-w-md text-base leading-relaxed text-white/70">
        See what is left, track your spending, and know what is safe to spend
        each day.
      </p>
      <ul className="mb-8 space-y-4">
        <li className="flex gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
            <Camera size={19} strokeWidth={1.75} aria-hidden />
          </span>
          <span>
            <span className="block font-medium">
              Snap GCash, Maya, or paper receipts
            </span>
            <span className="text-sm text-white/65">
              Read on your phone. Images are never uploaded.
            </span>
          </span>
        </li>
        <li className="flex gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
            <Smartphone size={19} strokeWidth={1.75} aria-hidden />
          </span>
          <span>
            <span className="block font-medium">
              Your records stay on this device
            </span>
            <span className="text-sm text-white/65">
              No account to make. Back up whenever you like.
            </span>
          </span>
        </li>
      </ul>
      <div className="mt-auto space-y-3 pt-2">
        <button
          type="button"
          className="btn onboarding-start w-full"
          onClick={() => setStep("allowance")}
          disabled={!world}
        >
          Get started <ArrowRight size={20} aria-hidden />
        </button>
        <button
          type="button"
          className="btn onboarding-restore w-full"
          onClick={() => setStep("restore")}
          disabled={!world}
        >
          <DatabaseBackup size={19} strokeWidth={1.75} aria-hidden /> I already
          have data to bring over
        </button>
      </div>
    </div>
  );
}
