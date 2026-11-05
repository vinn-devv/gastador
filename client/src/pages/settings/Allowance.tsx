import { CalendarPlus, Pencil, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../app/DataProvider';
import { Banner, EmptyState, ProgressBar, ScreenSkeleton, Tag } from '../../components/ui/Bits';
import { centavosToInput, ChipGroup, MoneyField, SelectField, TextField } from '../../components/ui/Fields';
import { Page, PageHeader, Section } from '../../components/ui/PageHeader';
import { ConfirmSheet } from '../../components/ui/Sheet';
import { useToast } from '../../components/ui/Toast';
import { CategoryIcon } from '../../components/CategoryIcon';
import { cycleStatus, endDateFromNextAllowance, expensesInCycle, nextAllowanceDate, nextAllowanceFromEnd, spendableCentavos, suggestNextCycleStart, transactionsInCycle } from '../../domain/allowance';
import { addDays, daysInclusive, formatDate, formatRange, isValidDate } from '../../domain/dates';
import { divFloor, formatMoney, parseMoney, ratioPercent } from '../../domain/money';
import type { Frequency } from '../../domain/types';
import { ValidationError } from '../../domain/validation';
import { createCycle, deleteCycle, setCycleLimit, updateCycle } from '../../data/repo';

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' }
];

export function AllowanceList() {
  const { world, today } = useData();
  if (!world) return <ScreenSkeleton />;
  return (
    <>
      <PageHeader title="Allowance and cycles" back="/settings" action={<Link to="/settings/allowance/new" className="btn btn-primary btn-sm"><CalendarPlus size={18} aria-hidden /> New</Link>} />
      <Page className="max-w-2xl md:mx-0">
        {world.cycles.length === 0 ? (
          <EmptyState icon={Wallet} title="No allowance cycles yet" action={<Link to="/settings/allowance/new" className="btn btn-primary">Set up allowance</Link>}>
            A cycle is the period between one allowance and the next.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {world.cycles.map((c) => {
              const status = cycleStatus(c, today);
              const spent = expensesInCycle(c, world.transactions);
              return (
                <li key={c.id}>
                  <Link to={`/settings/allowance/${c.id}`} className="flex min-h-[92px] items-center gap-3 px-1 py-3 transition-colors duration-150 hover:bg-sunken sm:px-3">
                    <span className="min-w-0 flex-1">
                      <span className="mb-0.5 flex items-center gap-2">
                        <span className="truncate font-semibold">{c.name}</span>
                        {status === 'active' && <Tag tone="good">Current</Tag>}
                        {status === 'upcoming' && <Tag tone="info">Upcoming</Tag>}
                      </span>
                      <span className="mb-2 block text-sm text-muted">{formatRange(c.startDate, c.endDate)}</span>
                      <span className="num mb-1.5 flex justify-between gap-3 text-xs text-muted"><span>{formatMoney(spent)} spent</span><span>of {formatMoney(spendableCentavos(c))}</span></span>
                      <ProgressBar percent={ratioPercent(spent, spendableCentavos(c))} label={`${c.name} allowance used`} />
                    </span>
                    <Pencil size={18} strokeWidth={1.75} className="text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Page>
    </>
  );
}

export function CycleEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const { world, today } = useData();
  const navigate = useNavigate();
  const toast = useToast();
  const existing = isNew ? undefined : world?.cycles.find((c) => c.id === id);
  const latest = world?.cycles[0];

  const initialStart = useMemo(() => existing?.startDate ?? (latest && latest.endDate >= today ? suggestNextCycleStart(latest) : latest ? (suggestNextCycleStart(latest) > today ? suggestNextCycleStart(latest) : today) : today), [existing, latest, today]);
  const [name, setName] = useState(existing?.name ?? '');
  const [allowance, setAllowance] = useState(existing ? centavosToInput(existing.allowanceCentavos) : '');
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? 'biweekly');
  const [start, setStart] = useState(initialStart);
  const [next, setNext] = useState(existing ? nextAllowanceFromEnd(existing.endDate) : nextAllowanceDate('biweekly', initialStart) ?? addDays(initialStart, 14));
  const [savings, setSavings] = useState(existing ? centavosToInput(existing.plannedSavingsCentavos) : '');
  const [carryFrom, setCarryFrom] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setAllowance(centavosToInput(existing.allowanceCentavos));
      setFrequency(existing.frequency);
      setStart(existing.startDate);
      setNext(nextAllowanceFromEnd(existing.endDate));
      setSavings(centavosToInput(existing.plannedSavingsCentavos));
    }
  }, [existing?.id]);

  if (!world) return <ScreenSkeleton />;
  if (!isNew && !existing) return <><PageHeader title="Cycle" back="/settings/allowance" /><Page><Banner tone="warn">That cycle no longer exists.</Banner></Page></>;

  const pickFrequency = (f: Frequency) => {
    setFrequency(f);
    const n = nextAllowanceDate(f, start);
    if (n) setNext(n);
  };
  const pickStart = (value: string) => {
    setStart(value);
    if (isValidDate(value)) {
      const n = nextAllowanceDate(frequency, value);
      if (n) setNext(n);
    }
  };

  const end = isValidDate(next) ? endDateFromNextAllowance(next) : '';
  const allowanceCents = parseMoney(allowance) ?? 0;
  const savingsCents = savings ? parseMoney(savings) ?? 0 : 0;
  const carryCycle = world.cycles.find((c) => c.id === carryFrom);
  const carryPreview = carryCycle ? Math.max(0, spendableCentavos(carryCycle) - expensesInCycle(carryCycle, world.transactions)) : existing?.carryoverCentavos ?? 0;
  const length = isValidDate(start) && end && end >= start ? daysInclusive(start, end) : 0;
  const spendable = allowanceCents + carryPreview - savingsCents;
  const daily = length > 0 && spendable > 0 ? divFloor(spendable, length) : 0;
  const defaultName = `Allowance from ${formatDate(start, false)}`;
  const limitableCycle = existing;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found: Record<string, string> = {};
    const a = parseMoney(allowance);
    if (a === null) found.allowance = 'Enter your allowance amount, like 2000 or 1,500.50.';
    const s = savings.trim() === '' ? 0 : parseMoney(savings);
    if (s === null) found.plannedSavings = 'Enter an amount like 100, or leave it empty.';
    if (!isValidDate(start)) found.startDate = 'Choose a start date.';
    if (!isValidDate(next)) found.endDate = 'Choose when your next allowance arrives.';
    setErrors(found);
    if (Object.keys(found).length || a === null || s === null) return;
    setBusy(true);
    try {
      const input = { name: name.trim() || defaultName, frequency, startDate: start, endDate: endDateFromNextAllowance(next), allowanceCentavos: a, plannedSavingsCentavos: s };
      if (existing) await updateCycle(existing.id, input);
      else await createCycle(input, { carryFromCycleId: carryFrom || null });
      toast('Allowance cycle saved.');
      navigate('/settings/allowance', { replace: true });
    } catch (error) {
      if (error instanceof ValidationError) {
        const f = { ...error.fields };
        setErrors(f);
      } else setErrors({ form: 'Could not save this cycle. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={existing ? 'Edit cycle' : 'New allowance cycle'} back="/settings/allowance" />
      <Page className="max-w-xl md:mx-0">
        <form onSubmit={submit} noValidate>
          {errors.form && <Banner tone="bad">{errors.form}</Banner>}
          <MoneyField label="Allowance amount" value={allowance} onChange={setAllowance} error={errors.allowance} autoFocus={isNew} large />
          <ChipGroup label="How often do you get it?" options={FREQUENCIES} value={frequency} onChange={pickFrequency} />
          <div className="grid gap-x-3 sm:grid-cols-2">
            <TextField label="Starts on" type="date" value={start} onChange={(e) => pickStart(e.target.value)} error={errors.startDate} />
            <TextField label="Next allowance arrives" type="date" value={next} min={addDays(isValidDate(start) ? start : today, 1)} onChange={(e) => { setNext(e.target.value); setFrequency('custom'); }} error={errors.endDate} hint={end && !errors.endDate ? `Last day of this cycle: ${formatDate(end)}.` : undefined} />
          </div>
          <TextField label="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultName} maxLength={80} error={errors.name} />
          <MoneyField label="Set aside for savings (optional)" value={savings} onChange={setSavings} error={errors.plannedSavings} hint="Taken out of what you can spend. Track the savings themselves under Savings goals." />
          {isNew && world.cycles.length > 0 && (
            <SelectField label="Carry over what is left from" value={carryFrom} onChange={(e) => setCarryFrom(e.target.value)} hint="Only a positive balance is carried over.">
              <option value="">Nothing</option>
              {world.cycles.map((c) => (
                <option key={c.id} value={c.id}>{c.name} (ends {formatDate(c.endDate, false)})</option>
              ))}
            </SelectField>
          )}

          <div className="mb-5 border-y border-line py-4 text-sm" aria-live="polite">
            <p className="mb-3 font-semibold">Cycle summary</p>
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-muted">Days in cycle</dt>
              <dd className="num text-right font-medium">{length || '—'}</dd>
              <dt className="text-muted">Available to spend</dt>
              <dd className="num text-right font-medium">{formatMoney(Math.max(0, spendable))}</dd>
              <dt className="text-muted">Planned per day</dt>
              <dd className="num text-right font-medium">{length ? formatMoney(daily) : '—'}</dd>
              {carryPreview > 0 && (
                <>
                  <dt className="text-muted">Carried over</dt>
                  <dd className="num text-right font-medium">{formatMoney(carryPreview)}</dd>
                </>
              )}
            </dl>
          </div>

          {limitableCycle && <CategoryLimits cycleId={limitableCycle.id} />}

          <div className="action-bar md:static md:border-0 md:bg-transparent md:p-0">
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : 'Save cycle'}</button>
            </div>
          </div>
          {existing && (
            <button type="button" className="btn btn-danger btn-sm mt-3" onClick={() => setConfirmDelete(true)}>
              Delete this cycle
            </button>
          )}
        </form>
      </Page>
      {confirmDelete && existing && (
        <ConfirmSheet
          title="Delete this cycle?"
          message={`${existing.name} and its category limits will be removed. Your ${transactionsInCycle(existing, world.transactions).length} expenses in these dates are kept, but will no longer count toward any allowance.`}
          confirmLabel="Delete cycle"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteCycle(existing.id);
            toast('Cycle deleted.');
            navigate('/settings/allowance', { replace: true });
          }}
        />
      )}
    </>
  );
}

function CategoryLimits({ cycleId }: { cycleId: string }) {
  const { world, categoryById } = useData();
  const toast = useToast();
  if (!world) return null;
  const cats = world.categories.filter((c) => !c.archivedAt);
  const limitFor = (categoryId: string) => world.limits.find((l) => l.cycleId === cycleId && l.categoryId === categoryId)?.limitCentavos ?? 0;
  return (
    <Section title="Category limits (optional)">
      <p className="mb-3 text-sm text-muted">Set a limit for any category you want to keep an eye on. Leave it empty for no limit. Limits only show a note, they never block you.</p>
      <ul className="divide-y divide-line border-y border-line">
        {cats.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-1 py-3 sm:px-2">
            <CategoryIcon name={categoryById.get(c.id)?.name ?? c.name} size={17} />
            <label htmlFor={`limit-${c.id}`} className="min-w-0 flex-1 truncate font-medium">{c.name}</label>
            <div className="relative w-32 shrink-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden>₱</span>
              <input
                id={`limit-${c.id}`}
                className="input num pl-8"
                inputMode="decimal"
                placeholder="No limit"
                defaultValue={centavosToInput(limitFor(c.id))}
                key={`${c.id}-${limitFor(c.id)}`}
                onBlur={async (e) => {
                  const raw = e.target.value.trim();
                  const cents = raw === '' ? null : parseMoney(raw);
                  if (raw !== '' && cents === null) return toast('Enter a limit like 500 or leave it empty.', 'error');
                  if ((cents ?? 0) !== limitFor(c.id)) {
                    await setCycleLimit(cycleId, c.id, cents);
                    toast('Limit saved.');
                  }
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
