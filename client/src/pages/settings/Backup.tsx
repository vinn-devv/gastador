import { Download, FileSpreadsheet, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useData } from '../../app/DataProvider';
import { RestorePanel, downloadText } from '../../components/RestorePanel';
import { Banner, ScreenSkeleton } from '../../components/ui/Bits';
import { Toggle } from '../../components/ui/Fields';
import { Page, PageHeader, Section } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { backupFilename, createBackup } from '../../data/backup';
import { transactionsToCsv } from '../../domain/csv';

export default function Backup() {
  const { world } = useData();
  const toast = useToast();
  const [withImages, setWithImages] = useState(true);
  const [busy, setBusy] = useState(false);
  if (!world) return <ScreenSkeleton />;

  async function exportJson() {
    setBusy(true);
    try {
      const file = await createBackup({ includeReceipts: withImages });
      downloadText(backupFilename(), JSON.stringify(file), 'application/json');
      toast('Backup downloaded. Keep it somewhere safe.');
    } catch {
      toast('Could not create the backup.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    downloadText(`gastador-expenses-${new Date().toISOString().slice(0, 10)}.csv`, transactionsToCsv(world!.transactions, world!.categories), 'text/csv;charset=utf-8');
    toast('CSV downloaded.');
  }

  return (
    <>
      <PageHeader title="Backup and restore" back="/settings" />
      <Page className="max-w-2xl md:mx-0">
        <Banner tone="warn" icon={TriangleAlert} title="Your data lives only on this device">
          Gastador keeps your expenses in this browser or app. Clearing app data, clearing browser data, uninstalling, or losing the phone can erase them. Download a backup now and then. The data is not encrypted by Gastador; anyone who opens your backup file can read it, so store it privately.
        </Banner>

        <Section title="Save a copy">
          <Toggle label="Include receipt images" description="Makes the file larger, but restores your photos too." checked={withImages} onChange={setWithImages} />
          <div className="mt-3 grid gap-3 sm:max-w-2xl sm:grid-cols-2">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={exportJson}>
              <Download size={20} strokeWidth={1.75} aria-hidden /> {busy ? 'Preparing…' : 'Download backup (JSON)'}
            </button>
            <button type="button" className="btn btn-secondary" disabled={world.transactions.length === 0} onClick={exportCsv}>
              <FileSpreadsheet size={20} strokeWidth={1.75} aria-hidden /> Expenses as CSV
            </button>
          </div>
          <p className="hint">The JSON backup can be restored here. The CSV is for spreadsheets and cannot be restored.</p>
        </Section>

        <Section title="Restore or import">
          <RestorePanel />
        </Section>
      </Page>
    </>
  );
}
