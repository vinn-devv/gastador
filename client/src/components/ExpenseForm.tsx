import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useData } from '../app/DataProvider';
import { cycleForDate } from '../domain/allowance';
import { findStandardMatch } from '../domain/categories';
import { fromManilaInput, manilaDateOf, nowManilaInput, toManilaInput, formatRange } from '../domain/dates';
import { findDuplicate } from '../domain/duplicates';
import { formatMoney, parseMoney } from '../domain/money';
import { PAYMENT_METHODS, type OcrStatus, type PaymentMethod, type Transaction, type TxSource } from '../domain/types';
import { ValidationError } from '../domain/validation';
import { addTransaction, deleteTransaction, DuplicateError, getReceiptBlob, saveReceipt, updateTransaction } from '../data/repo';
import { centavosToInput, ChipGroup, MoneyField, TextAreaField, TextField, Toggle } from './ui/Fields';
import { Banner } from './ui/Bits';
import { ConfirmSheet } from './ui/Sheet';
import { useToast } from './ui/Toast';
import type { Confidence } from '../ocr/parse';

export interface FormPrefill {
  amount?: string;
  merchant?: string;
  occurred?: string;
  method?: PaymentMethod;
  categoryKey?: string | null;
  reference?: string | null;
  confidence?: Partial<Record<'amount' | 'merchant' | 'occurred' | 'method', Confidence | 'missing'>>;
  source: TxSource;
  ocrFailed?: boolean;
  receipt?: Blob;
}

interface Props {
  initial?: Transaction;
  prefill?: FormPrefill;
  submitLabel?: string;
  onSaved: (tx: Transaction) => void;
  onDeleted?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
}

function confidenceHint(c: Confidence | 'missing' | undefined, noun: string): string | undefined {
  if (!c || c === 'high') return undefined;
  if (c === 'missing') return `Not found in the image. Enter ${noun} yourself.`;
  return `Read with ${c} confidence. Please check ${noun}.`;
}

export function ExpenseForm({ initial, prefill, submitLabel, onSaved, onDeleted, onCancel, cancelLabel = 'Cancel' }: Props) {
  const { world, activeCategories, categoryById } = useData();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const originalPrefill = useRef(prefill);

  const defaultCategory = useMemo(() => {
    if (initial) return initial.categoryId;
    const byKey = prefill?.categoryKey ? findStandardMatch(world?.categories ?? [], prefill.categoryKey as 'food') : undefined;
    return byKey?.id ?? findStandardMatch(world?.categories ?? [], 'others')?.id ?? activeCategories[0]?.id ?? '';
  }, [initial, prefill?.categoryKey, world?.categories, activeCategories]);

  const [amount, setAmount] = useState(initial ? centavosToInput(initial.amountCentavos) : prefill?.amount ?? '');
  const [merchant, setMerchant] = useState(initial?.merchant ?? prefill?.merchant ?? '');
  const [occurred, setOccurred] = useState(initial ? toManilaInput(initial.occurredAt) : prefill?.occurred ?? nowManilaInput());
  const [categoryId, setCategoryId] = useState(defaultCategory);
  const [method, setMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? prefill?.method ?? 'cash');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isSplurge, setIsSplurge] = useState(initial?.isSplurge ?? false);
  const [hashes, setHashes] = useState<string[]>(initial?.receiptHashes ?? []);
  const [pending, setPending] = useState<Blob | undefined>(prefill?.receipt);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId && defaultCategory) setCategoryId(defaultCategory);
  }, [categoryId, defaultCategory]);

  useEffect(() => {
    let live = true;
    const urls: string[] = [];
    Promise.all(hashes.map(async (h) => ({ h, blob: await getReceiptBlob(h) }))).then((list) => {
      if (!live) return;
      const next: Record<string, string> = {};
      for (const { h, blob } of list) if (blob) {
        const u = URL.createObjectURL(blob);
        urls.push(u);
        next[h] = u;
      }
      setThumbs(next);
    });
    return () => {
      live = false;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [hashes]);

  useEffect(() => {
    if (!pending) return setPendingUrl(null);
    const u = URL.createObjectURL(pending);
    setPendingUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pending]);

  const occurredIso = fromManilaInput(occurred);
  const amountCents = parseMoney(amount);
  const date = occurredIso ? manilaDateOf(occurredIso) : null;
  const cycle = date && world ? cycleForDate(world.cycles, date) : null;
  const duplicate = useMemo(() => {
    if (!world || !amountCents || !date || !merchant.trim() || initial) return null;
    return findDuplicate(world.transactions, { amountCentavos: amountCents, merchant, date, paymentMethod: method, externalReference: prefill?.reference ?? null });
  }, [world, amountCents, date, merchant, method, initial, prefill?.reference]);

  const merchantOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const t of world?.transactions ?? []) {
      if (seen.size >= 40) break;
      seen.add(t.merchant);
    }
    return [...seen];
  }, [world?.transactions]);

  const categoryOptions = activeCategories.concat(initial && categoryById.get(initial.categoryId)?.archivedAt ? [categoryById.get(initial.categoryId)!] : []).map((c) => ({ value: c.id, label: c.name }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (amountCents === null || amountCents <= 0) next.amount = 'Enter an amount above ₱0, like 125 or 125.50.';
    if (!merchant.trim()) next.merchant = 'Enter where you spent it.';
    if (!occurredIso) next.occurred = 'Choose a valid date and time.';
    if (!categoryId) next.categoryId = 'Choose a category.';
    setErrors(next);
    if (Object.keys(next).length || amountCents === null || !occurredIso) return;
    setBusy(true);
    try {
      const nextHashes = [...hashes];
      if (pending) nextHashes.push(await saveReceipt(pending));
      const orig = originalPrefill.current;
      const ocrStatus: OcrStatus | undefined =
        !initial && orig && orig.source !== 'manual'
          ? orig.ocrFailed
            ? 'failed'
            : parseMoney(orig.amount ?? '') !== amountCents || (orig.merchant ?? '').trim() !== merchant.trim()
              ? 'corrected'
              : 'succeeded'
          : undefined;
      const input = {
        amountCentavos: amountCents,
        occurredAt: occurredIso,
        merchant,
        categoryId,
        paymentMethod: method,
        description,
        isSplurge,
        externalReference: initial?.externalReference ?? orig?.reference ?? null,
        receiptHashes: [...new Set(nextHashes)]
      };
      const tx = initial
        ? await updateTransaction(initial.id, input)
        : await addTransaction({ ...input, source: orig?.source ?? 'manual', ocrStatus }, { allowDuplicate: duplicate !== null });
      toast(`${initial ? 'Updated' : 'Saved'} ${formatMoney(tx.amountCentavos)} at ${tx.merchant}.`);
      onSaved(tx);
    } catch (error) {
      if (error instanceof ValidationError) setErrors(error.fields);
      else if (error instanceof DuplicateError) setErrors({ form: error.message });
      else setErrors({ form: error instanceof Error ? error.message : 'Could not save. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    setBusy(true);
    try {
      await deleteTransaction(initial.id);
      toast('Expense deleted.');
      onDeleted?.();
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  const conf = prefill?.confidence ?? {};
  const label = busy ? 'Saving…' : submitLabel ?? (initial ? 'Save changes' : duplicate ? 'Save anyway' : 'Save expense');

  return (
    <form onSubmit={submit} noValidate>
      <div className="pb-4">
        {prefill?.ocrFailed && (
          <Banner tone="warn" title="We could not read this image clearly">
            Fill in the details yourself. The image will still be attached if you save.
          </Banner>
        )}
        {errors.form && <Banner tone="bad">{errors.form}</Banner>}
        {duplicate && (
          <Banner tone="warn" title={duplicate.kind === 'reference' ? 'This payment reference is already saved' : 'This looks like a duplicate'}>
            {formatMoney(duplicate.existing.amountCentavos)} at {duplicate.existing.merchant} on {duplicate.existing.date} is already recorded. If this is a different payment, you can still save it.
          </Banner>
        )}

        <MoneyField large label="Amount" value={amount} onChange={setAmount} error={errors.amount ?? errors.amountCentavos} autoFocus={!initial && !prefill} hint={confidenceHint(conf.amount, 'the amount')} />
        <TextField label="Merchant or recipient" value={merchant} onChange={(e) => setMerchant(e.target.value)} maxLength={120} list="merchant-options" autoComplete="off" error={errors.merchant} hint={confidenceHint(conf.merchant, 'the name')} />
        <datalist id="merchant-options">
          {merchantOptions.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <ChipGroup label="Category" options={categoryOptions} value={categoryId} onChange={setCategoryId} error={errors.categoryId} />
        <ChipGroup label="Paid with" options={PAYMENT_METHODS} value={method} onChange={setMethod} />
        <TextField label="Date and time (Philippines)" type="datetime-local" value={occurred} onChange={(e) => setOccurred(e.target.value)} error={errors.occurred ?? errors.occurredAt} hint={errors.occurred ? undefined : confidenceHint(conf.occurred, 'the date') ?? (cycle ? `Counts toward ${cycle.name} (${formatRange(cycle.startDate, cycle.endDate)}).` : date ? 'No allowance cycle covers this date, so it will not change your balance.' : undefined)} />
        <TextAreaField label="Notes (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} error={errors.description} />

        <div className="mb-4 border-y border-line px-1">
          <Toggle label="Tag as a splurge" description="Just a label for you. Gastador will not judge or warn you about it." checked={isSplurge} onChange={setIsSplurge} />
        </div>

        <div className="mb-2">
          <span className="label">Receipt image (optional)</span>
          <div className="flex flex-wrap gap-3">
            {hashes.map((h) => (
              <div key={h} className="relative">
                {thumbs[h] ? <img src={thumbs[h]} alt="Attached receipt" className="h-24 w-24 rounded-md border border-line object-cover" /> : <div className="skeleton h-24 w-24" />}
                <button type="button" className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-bg" onClick={() => setHashes(hashes.filter((x) => x !== h))} aria-label="Remove receipt image">
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            ))}
            {pendingUrl && (
              <div className="relative">
                <img src={pendingUrl} alt="Receipt to attach" className="h-24 w-24 rounded-md border border-line object-cover" />
                <button type="button" className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-bg" onClick={() => setPending(undefined)} aria-label="Remove receipt image">
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            )}
            {!pending && (
              <button type="button" className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line text-sm text-muted hover:bg-sunken" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={22} strokeWidth={1.75} aria-hidden />
                Add image
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && f.size <= 10 * 1024 * 1024) setPending(f);
            else if (f) setErrors({ ...errors, form: 'That image is larger than 10 MB.' });
            e.target.value = '';
          }} />
          <p className="hint flex items-center gap-1.5"><Camera size={14} aria-hidden /> Images stay on this device.</p>
        </div>

        {initial && onDeleted && (
          <button type="button" className="btn btn-danger btn-sm mt-3" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={18} strokeWidth={1.75} aria-hidden /> Delete expense
          </button>
        )}
      </div>

      <div className="action-bar md:static md:border-0 md:bg-transparent md:p-0 md:pt-2">
        <div className="mx-auto flex max-w-xl gap-3">
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
            {label}
          </button>
        </div>
      </div>

      {confirmDelete && initial && (
        <ConfirmSheet title="Delete this expense?" message={`${formatMoney(initial.amountCentavos)} at ${initial.merchant} will be removed and your balance will update.`} confirmLabel="Delete" danger busy={busy} onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
      )}
    </form>
  );
}
