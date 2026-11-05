import { Archive, ArchiveRestore, Pencil, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useData } from '../../app/DataProvider';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Banner, ScreenSkeleton } from '../../components/ui/Bits';
import { TextField } from '../../components/ui/Fields';
import { Page, PageHeader, Section } from '../../components/ui/PageHeader';
import { Sheet } from '../../components/ui/Sheet';
import { useToast } from '../../components/ui/Toast';
import { addCategory, renameCategory, setCategoryArchived } from '../../data/repo';
import { ValidationError } from '../../domain/validation';
import type { Category } from '../../domain/types';

export default function Categories() {
  const { world } = useData();
  const toast = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  if (!world) return <ScreenSkeleton />;
  const counts = new Map<string, number>();
  for (const t of world.transactions) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);

  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      await addCategory(name);
      setName('');
      setError('');
      toast('Category added.');
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Could not add that category.');
    }
  }

  async function toggle(c: Category) {
    try {
      await setCategoryArchived(c.id, !c.archivedAt);
      toast(c.archivedAt ? 'Category restored.' : 'Category archived. Past expenses keep it.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not change that category.', 'error');
    }
  }

  async function rename(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      await renameCategory(editing.id, editName);
      setEditing(null);
      toast('Category renamed.');
    } catch (err) {
      setEditError(err instanceof ValidationError ? err.message : 'Could not rename.');
    }
  }

  const active = world.categories.filter((c) => !c.archivedAt);
  const archived = world.categories.filter((c) => c.archivedAt);
  const row = (c: Category) => (
    <li key={c.id} className="flex min-h-[64px] items-center gap-3 px-1 py-2 sm:px-2">
      <CategoryIcon name={c.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{c.name}</span>
        <span className="block text-sm text-muted">{counts.get(c.id) ?? 0} expense{(counts.get(c.id) ?? 0) === 1 ? '' : 's'}</span>
      </span>
      <button type="button" className="iconbtn" aria-label={`Rename ${c.name}`} onClick={() => { setEditing(c); setEditName(c.name); setEditError(''); }}>
        <Pencil size={18} strokeWidth={1.75} aria-hidden />
      </button>
      <button type="button" className="iconbtn" aria-label={`${c.archivedAt ? 'Restore' : 'Archive'} ${c.name}`} onClick={() => toggle(c)}>
        {c.archivedAt ? <ArchiveRestore size={18} strokeWidth={1.75} aria-hidden /> : <Archive size={18} strokeWidth={1.75} aria-hidden />}
      </button>
    </li>
  );

  return (
    <>
      <PageHeader title="Categories" back="/settings" />
      <Page className="max-w-2xl md:mx-0">
        <form onSubmit={add} className="mb-6 flex items-start gap-2" noValidate>
          <div className="flex-1">
            <TextField label="Add a category" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} error={error} fieldClassName="!mb-0" placeholder="Example: Pets" />
          </div>
          <button type="submit" className="btn btn-primary mt-[1.9rem] !px-4" aria-label="Add category"><Plus size={22} aria-hidden /></button>
        </form>
        <Section title="Active">
          <ul className="divide-y divide-line border-y border-line">{active.map(row)}</ul>
        </Section>
        {archived.length > 0 && (
          <Section title="Archived">
            <Banner tone="info">Archived categories stay on past expenses but are hidden when adding new ones.</Banner>
            <ul className="divide-y divide-line border-y border-line">{archived.map(row)}</ul>
            <p className="mt-2 text-sm text-muted">{archived.length} archived categor{archived.length === 1 ? 'y' : 'ies'}</p>
          </Section>
        )}
      </Page>
      {editing && (
        <Sheet title="Rename category" onClose={() => setEditing(null)}>
          <form onSubmit={rename} noValidate>
            <TextField label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={50} error={editError} autoFocus />
            <button type="submit" className="btn btn-primary w-full">Save name</button>
          </form>
        </Sheet>
      )}
    </>
  );
}
