import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../../components/ui/Bits';
import { Page, PageHeader, Section } from '../../components/ui/PageHeader';
import { ConfirmSheet } from '../../components/ui/Sheet';
import { useToast } from '../../components/ui/Toast';
import { wipeAllData } from '../../data/repo';

const FACTS = [
  ['On this device only', 'Your expenses, allowance cycles, categories, savings goals, receipt images, and settings are stored in this browser or app using IndexedDB.'],
  ['Never uploaded', 'Receipt images and the text read from them are processed on your phone. The text-reading engine and its language file are served with the app, not from a third party.'],
  ['What leaves the device', 'Only what you choose: a backup file you download, a CSV you export, or the purchase receipt checked with Google Play if you buy the lifetime unlock.'],
  ['Not encrypted by Gastador', 'Your phone’s own screen lock and storage protection apply. Backup files are plain text, so keep them private.'],
  ['Can be lost', 'Clearing app or browser data, uninstalling, or losing the phone removes your records. Download backups regularly.'],
  ['What Gastador never asks for', 'Passwords for GCash or Maya, PINs, OTPs, or card details. There are no ads, loans, buy-now-pay-later offers, or data sales.']
];

export default function Privacy() {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <>
      <PageHeader title="Privacy and your data" back="/settings" />
      <Page className="max-w-2xl md:mx-0">
        <dl className="mb-6 divide-y divide-line border-y border-line">
          {FACTS.map(([t, d]) => (
            <div key={t} className="p-4">
              <dt className="font-semibold">{t}</dt>
              <dd className="text-muted">{d}</dd>
            </div>
          ))}
        </dl>
        <Section title="Erase everything">
          <Banner tone="warn">This removes all expenses, cycles, categories, goals, images, and settings from this device. Your lifetime unlock stays with your Google account. Download a backup first if you might want your data back.</Banner>
          <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>Erase all data on this device</button>
        </Section>
      </Page>
      {confirm && (
        <ConfirmSheet
          title="Erase all data?"
          message="This cannot be undone. Everything stored by Gastador on this device will be removed."
          confirmLabel="Erase everything"
          danger
          busy={busy}
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            setBusy(true);
            await wipeAllData();
            setBusy(false);
            setConfirm(false);
            toast('All data erased.');
            navigate('/', { replace: true });
          }}
        />
      )}
    </>
  );
}
