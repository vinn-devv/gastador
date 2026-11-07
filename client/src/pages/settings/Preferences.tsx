import { useData } from '../../app/DataProvider';
import { ScreenSkeleton } from '../../components/ui/Bits';
import { SelectField, TextField, Toggle } from '../../components/ui/Fields';
import { Page, PageHeader, Section } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { updateSettings } from '../../data/repo';
import type { AlertPrefs, BudgetMethod, CurrencyCode } from '../../domain/types';

const ALERT_ROWS: [keyof AlertPrefs, string][] = [
  ['budget50', 'When half of the allowance is used'],
  ['budget75', 'When 75% is used'],
  ['budget90', 'When 90% is used'],
  ['budget100', 'When all of it is used'],
  ['categoryOverspend', 'When a category passes the limit I set'],
  ['cycleEndingSoon', 'When the cycle is about to end'],
  ['dailyReminder', 'If nothing is logged today, after a set time']
];

export default function Preferences() {
  const { world } = useData();
  const toast = useToast();
  if (!world) return <ScreenSkeleton />;
  const s = world.settings;
  const save = (patch: Parameters<typeof updateSettings>[0]) => updateSettings(patch).then(() => toast('Saved.'));
  return (
    <>
      <PageHeader title="Preferences" back="/settings" />
      <Page className="max-w-2xl md:mx-0">
        <Section title="Currency">
          <SelectField label="Display currency" value={s.currency} onChange={(e) => save({ currency: e.target.value as CurrencyCode })} hint="Gastador is built around the Philippine peso.">
            {(['PHP', 'USD', 'EUR', 'SGD'] as const).map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectField>
        </Section>
        <Section title="Budget method">
          <SelectField label="How do you want to track?" value={s.budgetMethod} onChange={(e) => save({ budgetMethod: e.target.value as BudgetMethod })}>
            <option value="daily_pace">Daily safe amount</option>
            <option value="category_limits">Category limits</option>
            <option value="simple_total">Just what is left</option>
          </SelectField>
        </Section>
        <Section title="Alerts on Home">
          <p className="mb-3 text-sm text-muted">Alerts appear inside the app. Gastador does not send push notifications.</p>
          <div className="divide-y divide-line border-y border-line">
            {ALERT_ROWS.map(([key, label]) => (
              <Toggle key={key} label={label} checked={Boolean(s.alerts[key])} onChange={(v) => save({ alerts: { [key]: v } })} />
            ))}
          </div>
          <div className="mt-4 grid gap-x-3 sm:grid-cols-2">
            <TextField label="Remind me after" type="time" value={s.alerts.dailyReminderTime} onChange={(e) => e.target.value && save({ alerts: { dailyReminderTime: e.target.value } })} />
            <TextField label="Days before the cycle ends" type="number" min={1} max={14} value={s.alerts.cycleEndingDays} onChange={(e) => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 1 && n <= 14) save({ alerts: { cycleEndingDays: n } }); }} />
          </div>
        </Section>
      </Page>
    </>
  );
}
