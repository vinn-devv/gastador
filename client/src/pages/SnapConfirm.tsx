import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ExpenseForm } from '../components/ExpenseForm';
import { Banner } from '../components/ui/Bits';
import { Page, PageHeader } from '../components/ui/PageHeader';
import { ConfirmSheet } from '../components/ui/Sheet';
import { getSnapSession, setSnapSession } from './snapSession';

const QUALITY_TEXT = {
  good: ['good', 'The image was clear. Still check the details below, because reading can make mistakes.'],
  fair: ['info', 'The image was readable, but some details may be wrong. Please check each field.'],
  poor: ['warn', 'The reading was weak. Please check every field carefully.'],
  failed: ['warn', 'We could not find an amount. Fill in the details yourself.']
} as const;

export default function SnapConfirm() {
  const session = getSnapSession();
  const navigate = useNavigate();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  if (!session) return <Navigate to="/snap" replace />;
  const [tone, text] = QUALITY_TEXT[session.quality];

  return (
    <>
      <PageHeader title="Check and save" back={false} />
      <Page className="max-w-xl md:mx-0">
        <Banner tone={tone as 'good'} title="Nothing is saved yet">
          {text}
        </Banner>
        <div className="mb-4 flex gap-3">
          <a href={session.imageUrl} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={session.imageUrl} alt="Your image. Tap to open it full size." className="h-28 w-24 rounded-md border border-line object-cover" />
          </a>
          <details className="min-w-0 flex-1 text-sm">
            <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold text-primary">What was read from the image</summary>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-sunken p-3 text-xs text-muted">{session.rawText.trim() || 'No text found.'}</pre>
          </details>
        </div>
        <ExpenseForm
          prefill={session.prefill}
          submitLabel="Save expense"
          cancelLabel="Discard"
          onCancel={() => setConfirmDiscard(true)}
          onSaved={() => {
            setSnapSession(null);
            navigate('/', { replace: true });
          }}
        />
      </Page>
      {confirmDiscard && (
        <ConfirmSheet
          title="Discard this import?"
          message="The image and what was read from it will be removed from this phone. Nothing has been saved."
          confirmLabel="Discard"
          danger
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => {
            setSnapSession(null);
            navigate('/snap', { replace: true });
          }}
        />
      )}
    </>
  );
}
