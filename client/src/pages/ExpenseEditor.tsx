import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../app/DataProvider';
import { ExpenseForm } from '../components/ExpenseForm';
import { Banner, EmptyState, ScreenSkeleton } from '../components/ui/Bits';
import { Page, PageHeader } from '../components/ui/PageHeader';
import { SearchX } from 'lucide-react';

export default function ExpenseEditor() {
  const { id } = useParams();
  const { world } = useData();
  const navigate = useNavigate();
  const isNew = id === 'new';
  if (!world) return <ScreenSkeleton />;
  const initial = isNew ? undefined : world.transactions.find((t) => t.id === id);
  if (!isNew && !initial) {
    return (
      <>
        <PageHeader title="Expense" back="/activity" />
        <Page>
          <EmptyState icon={SearchX} title="Expense not found" action={<button className="btn btn-primary" onClick={() => navigate('/activity', { replace: true })}>Back to activity</button>}>
            It may have been deleted on another tab.
          </EmptyState>
        </Page>
      </>
    );
  }
  return (
    <>
      <PageHeader title={isNew ? 'Add expense' : 'Edit expense'} back="/activity" />
      <Page className="max-w-xl md:px-0">
        {world.categories.filter((c) => !c.archivedAt).length === 0 && <Banner tone="warn">Add a category in Settings first.</Banner>}
        <ExpenseForm initial={initial} prefill={isNew ? undefined : undefined} onSaved={() => navigate('/activity')} onDeleted={() => navigate('/activity', { replace: true })} />
      </Page>
    </>
  );
}
