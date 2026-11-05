import { FileUp, Server } from 'lucide-react';
import { useRef, useState } from 'react';
import { useData } from '../app/DataProvider';
import { BackupError, backupFilename, createBackup, parseBackup, restoreBackup, summarizeBackup, type BackupFile, type RestoreMode } from '../data/backup';
import { convertLegacyExport, fetchLegacyExport, importLegacyExport, isLegacyExport, LegacyLoginError, type LegacyReport } from '../data/legacy';
import { formatDate } from '../domain/dates';
import { Banner } from './ui/Bits';
import { TextField } from './ui/Fields';
import { ConfirmSheet } from './ui/Sheet';
import { useToast } from './ui/Toast';

type Preview = { kind: 'backup'; file: BackupFile } | { kind: 'legacy'; raw: unknown; report: LegacyReport };

export function downloadText(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RestorePanel({ onDone }: { onDone?: () => void }) {
  const { world } = useData();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mode, setMode] = useState<RestoreMode>('merge');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [account, setAccount] = useState({ email: '', password: '' });
  const [showAccount, setShowAccount] = useState(false);
  const hasData = Boolean(world && (world.transactions.length > 0 || world.cycles.length > 0));

  async function handleFile(file: File | undefined) {
    setError('');
    setPreview(null);
    if (!file) return;
    if (file.size > 80 * 1024 * 1024) return setError('That file is too large to be a Gastador backup.');
    try {
      const text = await file.text();
      const json: unknown = JSON.parse(text.replace(/^\uFEFF/, ''));
      if (isLegacyExport(json)) {
        const { report } = convertLegacyExport(json);
        setPreview({ kind: 'legacy', raw: json, report });
      } else {
        const parsed = parseBackup(json);
        setMode(hasData ? 'merge' : 'replace');
        setPreview({ kind: 'backup', file: parsed });
      }
    } catch (e) {
      setError(e instanceof BackupError ? e.message : 'That file is not a Gastador backup or export.');
    }
  }

  async function fromAccount(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const raw = await fetchLegacyExport(account.email.trim(), account.password);
      const { report } = convertLegacyExport(raw);
      setAccount({ email: '', password: '' });
      setPreview({ kind: 'legacy', raw, report });
    } catch (err) {
      setError(err instanceof LegacyLoginError || err instanceof BackupError ? err.message : 'Could not import from the old account.');
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      if (preview.kind === 'backup') {
        const report = await restoreBackup(preview.file, mode);
        toast(`Restored ${report.transactions} expense${report.transactions === 1 ? '' : 's'}.`);
      } else {
        const { restore } = await importLegacyExport(preview.raw);
        toast(`Imported ${restore.transactions} expense${restore.transactions === 1 ? '' : 's'} from your old account.`);
      }
      setPreview(null);
      setConfirmReplace(false);
      onDone?.();
    } catch (e) {
      setError(e instanceof BackupError ? e.message : 'The restore failed and nothing was changed.');
    } finally {
      setBusy(false);
    }
  }

  async function saveCurrent() {
    const file = await createBackup({ includeReceipts: true });
    downloadText(backupFilename(), JSON.stringify(file), 'application/json');
    toast('Backup of your current data downloaded.');
  }

  return (
    <div>
      {error && <Banner tone="bad">{error}</Banner>}
      <input ref={input} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className="btn btn-secondary justify-start" onClick={() => input.current?.click()}>
          <FileUp size={20} strokeWidth={1.75} aria-hidden /> Choose a backup file
        </button>
        <button type="button" className="btn btn-secondary justify-start" aria-expanded={showAccount} onClick={() => setShowAccount(!showAccount)}>
          <Server size={20} strokeWidth={1.75} aria-hidden /> Import from old online account
        </button>
      </div>

      {showAccount && !preview && (
        <form onSubmit={fromAccount} className="card mt-3 p-4" noValidate>
          <p className="mb-3 text-sm text-muted">For people who used Gastador with an email and password on the old server. Your login goes only to that server, and a copy of your data is saved on this device. Nothing is sent anywhere else.</p>
          <TextField label="Email" type="email" autoComplete="username" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
          <TextField label="Password" type="password" autoComplete="current-password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
          <button type="submit" className="btn btn-primary w-full" disabled={busy || !account.email || !account.password}>{busy ? 'Contacting your old server…' : 'Import my data'}</button>
        </form>
      )}

      {preview?.kind === 'backup' && (
        <div className="card mt-4 p-4">
          <h3 className="mb-1">Backup found</h3>
          <p className="mb-3 text-sm text-muted">Made on {formatDate(preview.file.exportedAt.slice(0, 10))}</p>
          <ul className="mb-4 grid grid-cols-2 gap-1 text-sm">
            {Object.entries(summarizeBackup(preview.file)).filter(([k]) => k !== 'exportedAt').map(([k, v]) => (
              <li key={k} className="flex justify-between gap-2 rounded-sm bg-sunken px-3 py-2 capitalize"><span className="text-muted">{k}</span><span className="num font-semibold">{String(v)}</span></li>
            ))}
          </ul>
          {hasData && (
            <fieldset className="mb-4">
              <legend className="label">What should happen to the data already on this device?</legend>
              <div className="flex flex-col gap-2">
                <button type="button" role="radio" aria-checked={mode === 'merge'} className="chip !justify-start !whitespace-normal !py-3 text-left" onClick={() => setMode('merge')}>Add what is missing, keep everything here</button>
                <button type="button" role="radio" aria-checked={mode === 'replace'} className="chip !justify-start !whitespace-normal !py-3 text-left" onClick={() => setMode('replace')}>Replace everything on this device with the backup</button>
              </div>
            </fieldset>
          )}
          {hasData && mode === 'replace' && (
            <Banner tone="warn" action={<button type="button" className="btn btn-secondary btn-sm" onClick={saveCurrent}>Download current data first</button>}>
              Replacing removes your current expenses, cycles, and goals from this device.
            </Banner>
          )}
          <div className="flex gap-3">
            <button type="button" className="btn btn-secondary" onClick={() => setPreview(null)}>Cancel</button>
            <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={() => (hasData && mode === 'replace' ? setConfirmReplace(true) : run())}>{busy ? 'Restoring…' : mode === 'replace' ? 'Restore backup' : 'Add to this device'}</button>
          </div>
        </div>
      )}

      {preview?.kind === 'legacy' && (
        <div className="card mt-4 p-4">
          <h3 className="mb-1">Old Gastador data found</h3>
          <p className="mb-3 text-sm text-muted">It will be added to this device. Nothing on the old server is changed or deleted.</p>
          <ul className="mb-4 grid grid-cols-2 gap-1 text-sm">
            {Object.entries(preview.report.counts).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-2 rounded-sm bg-sunken px-3 py-2 capitalize"><span className="text-muted">{k}</span><span className="num font-semibold">{v}</span></li>
            ))}
          </ul>
          {preview.report.warnings.map((w) => <Banner key={w} tone="info">{w}</Banner>)}
          <div className="flex gap-3">
            <button type="button" className="btn btn-secondary" onClick={() => setPreview(null)}>Cancel</button>
            <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={run}>{busy ? 'Importing…' : 'Import to this device'}</button>
          </div>
        </div>
      )}

      {confirmReplace && (
        <ConfirmSheet title="Replace all data on this device?" message="Your current expenses, cycles, categories, and goals will be replaced by the backup. This cannot be undone." confirmLabel="Replace everything" danger busy={busy} onCancel={() => setConfirmReplace(false)} onConfirm={run} />
      )}
    </div>
  );
}
