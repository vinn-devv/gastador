import { Lock, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useBilling } from '../../app/BillingProvider';
import { useData } from '../../app/DataProvider';
import { Banner, EmptyState, ProgressBar, ScreenSkeleton } from '../../components/ui/Bits';
import { MoneyField, TextField } from '../../components/ui/Fields';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { ConfirmSheet, Sheet } from '../../components/ui/Sheet';
import { useToast } from '../../components/ui/Toast';
import { addContribution, addGoal, deleteGoal } from '../../data/repo';
import { formatDate } from '../../domain/dates';
import { formatMoney, parseMoney } from '../../domain/money';
import { goalProgress, type GoalProgress } from '../../domain/savings';
import { ValidationError } from '../../domain/validation';

export default function Savings() {
  const { world, today } = useData();
  const billing = useBilling();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState<GoalProgress | null>(null);
  const [removing, setRemoving] = useState<GoalProgress | null>(null);
  const [form, setForm] = useState({ name: '', target: '', date: '' });
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!world) return <ScreenSkeleton />;
  const goals = world.goals.map((g) => goalProgress(g, world.contributions, today));
  const locked = !billing.canAddGoal(world.goals.length);

  async function create(e: FormEvent) {
    e.preventDefault();
    const target = parseMoney(form.target);
    if (target === null) return setErrors({ target: 'Enter a target like 5000.' });
    try {
      await addGoal({ name: form.name, targetCentavos: target, targetDate: form.date || null });
      setCreating(false);
      setForm({ name: '', target: '', date: '' });
      setErrors({});
      toast('Goal created.');
    } catch (err) {
      setErrors(err instanceof ValidationError ? err.fields : { form: 'Could not create the goal.' });
    }
  }

  async function contribute(e: FormEvent) {
    e.preventDefault();
    const cents = parseMoney(amount);
    if (cents === null || cents <= 0) return setErrors({ amount: 'Enter an amount above ₱0.' });
    try {
      await addContribution(adding!.goal.id, cents);
      toast(`Added ${formatMoney(cents)} to ${adding!.goal.name}.`);
      setAdding(null);
      setAmount('');
      setErrors({});
    } catch (err) {
      setErrors(err instanceof ValidationError ? err.fields : { form: 'Could not save that.' });
    }
  }

  return (
    <>
      <PageHeader title="Savings goals" back="/settings" action={<button type="button" className="btn btn-primary btn-sm" onClick={() => (locked ? undefined : (setErrors({}), setCreating(true)))} disabled={locked}><Plus size={18} aria-hidden /> New</button>} />
      <Page className="max-w-2xl md:mx-0">
        <p className="mb-4 text-sm text-muted">Money you put toward a goal is not an expense, so it never lowers your daily spending amount. To keep it out of your spending money, set it aside on your allowance cycle.</p>
        {locked && (
          <Banner tone="info" icon={Lock} title="Free plan: 2 savings goals" action={<Link to="/settings/unlock" className="btn btn-primary btn-sm">See lifetime unlock</Link>} />
        )}
        {goals.length === 0 ? (
          <EmptyState icon={PiggyBank} title="No savings goals yet" action={<button type="button" className="btn btn-primary" onClick={() => { setErrors({}); setCreating(true); }}>Create a goal</button>}>
            Saving for a laptop, a trip, or an emergency fund? Track it here.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {goals.map((g) => (
              <li key={g.goal.id} className="py-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{g.goal.name}</p>
                    <p className="num text-sm text-muted">{formatMoney(g.savedCentavos)} of {formatMoney(g.goal.targetCentavos)}</p>
                  </div>
                  <p className="num font-semibold">{Math.round(g.percent)}%</p>
                </div>
                <ProgressBar percent={g.percent} tone="mint" label={`${g.goal.name} progress`} />
                <p className="num mt-3 text-sm">
                  {g.remainingCentavos === 0 ? 'Goal reached.' : `${formatMoney(g.remainingCentavos)} to go`}
                  {g.goal.targetDate ? ` · by ${formatDate(g.goal.targetDate)}` : ''}
                </p>
                {g.perDayCentavos !== null && <p className="num text-sm text-muted">About {formatMoney(g.perDayCentavos)} a day to get there.</p>}
                {g.daysLeft !== null && g.daysLeft <= 0 && g.remainingCentavos > 0 && <p className="text-sm text-muted">The target date has passed.</p>}
                <div className="mt-3 flex gap-2 sm:max-w-sm">
                  <button type="button" className="btn btn-soft btn-sm flex-1" onClick={() => { setErrors({}); setAdding(g); }}>Add savings</button>
                  <button type="button" className="iconbtn border border-line" aria-label={`Delete ${g.goal.name}`} onClick={() => setRemoving(g)}><Trash2 size={18} strokeWidth={1.75} aria-hidden /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Page>

      {creating && (
        <Sheet title="New savings goal" onClose={() => setCreating(false)}>
          <form onSubmit={create} noValidate>
            {errors.form && <Banner tone="bad">{errors.form}</Banner>}
            <TextField label="What are you saving for?" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} error={errors.name} autoFocus />
            <MoneyField label="Target amount" value={form.target} onChange={(v) => setForm({ ...form, target: v })} error={errors.target} />
            <TextField label="Target date (optional)" type="date" value={form.date} min={today} onChange={(e) => setForm({ ...form, date: e.target.value })} error={errors.targetDate} />
            <button type="submit" className="btn btn-primary w-full">Create goal</button>
          </form>
        </Sheet>
      )}
      {adding && (
        <Sheet title={`Add to ${adding.goal.name}`} onClose={() => setAdding(null)}>
          <form onSubmit={contribute} noValidate>
            {errors.form && <Banner tone="bad">{errors.form}</Banner>}
            <MoneyField label="Amount" value={amount} onChange={setAmount} error={errors.amount} autoFocus large />
            <button type="submit" className="btn btn-primary w-full">Save</button>
          </form>
        </Sheet>
      )}
      {removing && (
        <ConfirmSheet
          title="Delete this goal?"
          message={`${removing.goal.name} and its ${formatMoney(removing.savedCentavos)} of recorded savings will be removed from this device.`}
          confirmLabel="Delete goal"
          danger
          onCancel={() => setRemoving(null)}
          onConfirm={async () => {
            await deleteGoal(removing.goal.id);
            setRemoving(null);
            toast('Goal deleted.');
          }}
        />
      )}
    </>
  );
}
