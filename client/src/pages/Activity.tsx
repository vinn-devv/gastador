import { ListFilter, Plus, Search, Receipt, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../app/DataProvider';
import { TransactionRow } from '../components/TransactionRow';
import { Banner, EmptyState, ScreenSkeleton } from '../components/ui/Bits';
import { SelectField, TextField } from '../components/ui/Fields';
import { Page, PageHeader } from '../components/ui/PageHeader';
import { Sheet } from '../components/ui/Sheet';
import { formatDayHeading } from '../domain/dates';
import { groupByDay } from '../domain/insights';
import { formatMoney, parseMoney } from '../domain/money';
import { PAYMENT_METHODS, type PaymentMethod } from '../domain/types';

interface Filters {
  categoryId: string;
  method: '' | PaymentMethod;
  from: string;
  to: string;
  min: string;
  max: string;
  splurge: boolean;
  sort: 'newest' | 'oldest' | 'highest' | 'lowest';
}

const EMPTY: Filters = { categoryId: '', method: '', from: '', to: '', min: '', max: '', splurge: false, sort: 'newest' };
const PAGE = 60;

export default function Activity() {
  const { world, error, today, categoryById, activeCategories } = useData();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    if (!world) return [];
    const q = deferred.trim().toLowerCase();
    const min = filters.min ? parseMoney(filters.min) : null;
    const max = filters.max ? parseMoney(filters.max) : null;
    const list = world.transactions.filter((t) => {
      if (q && !`${t.merchant} ${t.description ?? ''} ${categoryById.get(t.categoryId)?.name ?? ''}`.toLowerCase().includes(q)) return false;
      if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
      if (filters.method && t.paymentMethod !== filters.method) return false;
      if (filters.from && t.date < filters.from) return false;
      if (filters.to && t.date > filters.to) return false;
      if (min !== null && t.amountCentavos < min) return false;
      if (max !== null && t.amountCentavos > max) return false;
      if (filters.splurge && !t.isSplurge) return false;
      return true;
    });
    if (filters.sort === 'oldest') list.sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1));
    if (filters.sort === 'highest') list.sort((a, b) => b.amountCentavos - a.amountCentavos);
    if (filters.sort === 'lowest') list.sort((a, b) => a.amountCentavos - b.amountCentavos);
    return list;
  }, [world, deferred, filters, categoryById]);

  const activeFilterCount = [filters.categoryId, filters.method, filters.from, filters.to, filters.min, filters.max, filters.splurge ? 'x' : ''].filter(Boolean).length + (filters.sort !== 'newest' ? 1 : 0);
  const total = filtered.reduce((s, t) => s + t.amountCentavos, 0);
  const visible = filtered.slice(0, limit);
  const grouped = filters.sort === 'newest' ? groupByDay(visible) : null;

  if (error) return <Page><Banner tone="bad">{error.message}</Banner></Page>;
  if (!world) return <ScreenSkeleton />;

  const addButton = (
    <Link to="/activity/new" className="btn btn-primary btn-sm !min-h-[44px] !px-4" aria-label="Add expense">
      <Plus size={20} strokeWidth={2} aria-hidden /> Add
    </Link>
  );

  return (
    <>
      <PageHeader title="Activity" subtitle={world.transactions.length ? `${world.transactions.length} recorded expense${world.transactions.length === 1 ? '' : 's'}` : 'Your expense history'} action={addButton} />
      <Page>
        <div className="mb-3 flex gap-2">
          <div className="relative flex-1">
            <Search size={18} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input className="input pl-10" type="search" placeholder="Search expenses" aria-label="Search expenses" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} />
          </div>
          <button type="button" className="btn btn-secondary relative !px-4" onClick={() => { setDraft(filters); setSheet(true); }} aria-label={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}>
            <ListFilter size={20} strokeWidth={1.75} aria-hidden />
            {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-onprimary">{activeFilterCount}</span>}
          </button>
        </div>

        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="group" aria-label="Quick filters">
          <button type="button" className="chip" aria-pressed={!filters.splurge && !filters.categoryId} onClick={() => setFilters({ ...filters, splurge: false, categoryId: '' })}>All</button>
          <button type="button" className="chip" aria-pressed={filters.splurge} onClick={() => setFilters({ ...filters, splurge: !filters.splurge })}>Tagged splurges</button>
          {activeCategories.slice(0, 6).map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={filters.categoryId === c.id} onClick={() => setFilters({ ...filters, categoryId: filters.categoryId === c.id ? '' : c.id })}>
              {c.name}
            </button>
          ))}
        </div>

        {world.transactions.length === 0 ? (
          <div>
            <EmptyState icon={Receipt} title="No expenses yet" action={<div className="flex gap-2"><Link to="/snap" className="btn btn-mint">Snap receipt</Link><Link to="/activity/new" className="btn btn-secondary">Add manually</Link></div>}>
              Snap a GCash or Maya screenshot, a paper receipt, or add an expense by hand.
            </EmptyState>
          </div>
        ) : filtered.length === 0 ? (
          <div>
            <EmptyState icon={Search} title="Nothing matches" action={<button type="button" className="btn btn-secondary" onClick={() => { setFilters(EMPTY); setQuery(''); }}>Clear search and filters</button>}>
              Try a different word or remove a filter.
            </EmptyState>
          </div>
        ) : (
          <>
            <p className="mb-2 text-sm text-muted" aria-live="polite">
              {filtered.length} expense{filtered.length === 1 ? '' : 's'} · <span className="num">{formatMoney(total)}</span> total
            </p>
            {grouped ? (
              grouped.map((g) => (
                <section key={g.date} className="mb-4" aria-label={formatDayHeading(g.date, today)}>
                  <div className="mb-1.5 flex items-baseline justify-between px-1">
                    <h2 className="text-sm font-semibold text-muted">{formatDayHeading(g.date, today)}</h2>
                    <span className="num text-sm text-muted">{formatMoney(g.total)}</span>
                  </div>
                  <ul className="divide-y divide-line border-y border-line">
                    {g.items.map((t) => (
                      <li key={t.id}>
                        <TransactionRow tx={t} categoryName={categoryById.get(t.categoryId)?.name ?? 'Unknown'} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {visible.map((t) => (
                  <li key={t.id}>
                    <TransactionRow tx={t} categoryName={categoryById.get(t.categoryId)?.name ?? 'Unknown'} showDate />
                  </li>
                ))}
              </ul>
            )}
            {filtered.length > limit && (
              <button type="button" className="btn btn-secondary mt-2 w-full" onClick={() => setLimit(limit + PAGE)}>
                Show more ({filtered.length - limit} left)
              </button>
            )}
          </>
        )}
      </Page>

      {sheet && (
        <Sheet
          title="Filter and sort"
          onClose={() => setSheet(false)}
          footer={
            <div className="flex gap-3">
              <button type="button" className="btn btn-secondary" onClick={() => { setFilters(EMPTY); setSheet(false); }}>
                <X size={18} aria-hidden /> Reset
              </button>
              <button type="button" className="btn btn-primary flex-1" onClick={() => { setFilters(draft); setLimit(PAGE); setSheet(false); }}>
                Apply
              </button>
            </div>
          }
        >
          <SelectField label="Category" value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
            <option value="">All categories</option>
            {world.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.archivedAt ? ' (archived)' : ''}</option>
            ))}
          </SelectField>
          <SelectField label="Paid with" value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value as Filters['method'] })}>
            <option value="">Any method</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </SelectField>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="From" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
            <TextField label="To" type="date" value={draft.to} min={draft.from} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
            <TextField label="Min amount" inputMode="decimal" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} />
            <TextField label="Max amount" inputMode="decimal" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value })} />
          </div>
          <SelectField label="Sort by" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: e.target.value as Filters['sort'] })}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
          </SelectField>
          <label className="flex min-h-[48px] items-center gap-3">
            <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--primary))]" checked={draft.splurge} onChange={(e) => setDraft({ ...draft, splurge: e.target.checked })} />
            <span>Only expenses I tagged as splurges</span>
          </label>
        </Sheet>
      )}
    </>
  );
}
