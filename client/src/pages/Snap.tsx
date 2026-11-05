import { Camera, CloudDownload, Image as ImageIcon, Lock, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useBilling } from '../app/BillingProvider';
import { useData } from '../app/DataProvider';
import { Banner, ProgressBar } from '../components/ui/Bits';
import { Page, PageHeader } from '../components/ui/PageHeader';
import { countOcrImportsInRange } from '../data/repo';
import { manilaToday, toManilaInput } from '../domain/dates';
import { downloadOcrAssets, isOcrReadyOffline, OCR_DOWNLOAD_MB, recognize } from '../ocr/engine';
import { parseText, readingQuality } from '../ocr/parse';
import { cropRect, enhanceContrast, type Crop } from '../ocr/preprocess';
import { getSnapSession, setSnapSession, takeSharedFile } from './snapSession';
import { SegmentedKind } from './SnapKind';

const MAX_SIDE = 1600;
const NO_CROP: Crop = { top: 0, bottom: 0, left: 0, right: 0 };

export default function Snap() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { current, today } = useData();
  const billing = useBilling();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [kind, setKind] = useState<'screenshot' | 'receipt'>('screenshot');
  const [crop, setCrop] = useState<Crop>(NO_CROP);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState<boolean | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [importsThisCycle, setImports] = useState(0);
  const existing = getSnapSession();

  useEffect(() => {
    isOcrReadyOffline().then(setReady);
  }, []);

  useEffect(() => {
    if (!current) return setImports(0);
    countOcrImportsInRange(current.cycle.startDate, current.cycle.endDate).then(setImports);
  }, [current]);

  const load = useCallback((file: File | undefined | null) => {
    setError('');
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError('Please choose a JPG, PNG, or WebP image.');
    if (file.size > 10 * 1024 * 1024) return setError('That image is larger than 10 MB. Try a smaller one.');
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setImage(img);
      setCrop(NO_CROP);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('That image could not be opened.');
    };
    img.src = url;
  }, []);

  useEffect(() => {
    if (params.get('shared')) {
      const f = takeSharedFile();
      if (f) load(f);
      else fetchSharedFromCache().then(load);
    }
  }, [params, load]);

  useEffect(() => {
    if (!image || !canvas.current) return;
    const r = cropRect(image.naturalWidth, image.naturalHeight, crop, MAX_SIDE);
    const c = canvas.current;
    c.width = r.outW;
    c.height = r.outH;
    c.getContext('2d')!.drawImage(image, r.sx, r.sy, r.sw, r.sh, 0, 0, r.outW, r.outH);
  }, [image, crop]);

  const blocked = billing.enforcement && !billing.canImport(importsThisCycle);

  async function read() {
    const c = canvas.current;
    if (!c) return;
    setError('');
    setProgress(0);
    try {
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.85));
      if (!blob) throw new Error('encode');
      const work = document.createElement('canvas');
      work.width = c.width;
      work.height = c.height;
      const ctx = work.getContext('2d')!;
      ctx.drawImage(c, 0, 0);
      const data = ctx.getImageData(0, 0, work.width, work.height);
      enhanceContrast(data.data);
      ctx.putImageData(data, 0, 0);
      const result = await recognize(work, setProgress);
      const parsed = parseText(result.text);
      const quality = parsed.amountCentavos ? readingQuality(result.confidence, parsed) : 'failed';
      const conf = (f: { confidence: 'high' | 'medium' | 'low' } | null) => (f ? f.confidence : ('missing' as const));
      setSnapSession({
        imageUrl: URL.createObjectURL(blob),
        rawText: result.text,
        quality,
        prefill: {
          source: kind,
          ocrFailed: !parsed.amountCentavos,
          receipt: blob,
          amount: parsed.amountCentavos ? (parsed.amountCentavos.value / 100).toFixed(2) : undefined,
          merchant: parsed.merchant?.value,
          occurred: parsed.occurredAtInput?.value ?? toManilaInput(new Date()),
          method: parsed.method?.value ?? (kind === 'receipt' ? 'cash' : undefined),
          categoryKey: parsed.categoryKey,
          reference: parsed.reference?.value ?? null,
          confidence: { amount: conf(parsed.amountCentavos), merchant: conf(parsed.merchant), occurred: parsed.occurredAtInput ? (parsed.occurredAtInput.confidence === 'high' ? 'high' : parsed.occurredAtInput.confidence) : 'missing', method: conf(parsed.method) }
        }
      });
      navigate('/snap/confirm');
    } catch {
      setError('Reading the image failed. You can enter the details yourself instead.');
    } finally {
      setProgress(null);
    }
  }

  async function prepare() {
    setDownloading(0);
    try {
      await downloadOcrAssets(setDownloading);
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed.');
    } finally {
      setDownloading(null);
    }
  }

  const slider = (k: keyof Crop, label: string) => (
    <label className="block text-sm">
      <span className="label">
        Trim {label}: {crop[k]}%
      </span>
      <input type="range" min={0} max={40} value={crop[k]} className="h-8 w-full accent-[rgb(var(--primary))]" onChange={(e) => setCrop({ ...crop, [k]: Number(e.target.value) })} />
    </label>
  );

  return (
    <>
      <PageHeader title="Snap it" subtitle={manilaToday() === today ? 'Read a GCash, Maya, or paper receipt' : undefined} />
      <Page className="max-w-xl md:mx-0">
        <p className="mb-4 flex items-start gap-2.5 text-sm text-muted">
          <ShieldCheck size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-teal" aria-hidden />
          The image is read on this phone. It is never uploaded, and the text it finds is not sent anywhere. Reading can make mistakes, so you always check before saving.
        </p>

        {error && <Banner tone="bad">{error}</Banner>}
        {existing && !image && (
          <Banner tone="info" title="You have an unsaved import" action={<Link to="/snap/confirm" className="btn btn-soft btn-sm">Continue</Link>} />
        )}
        {blocked && (
          <Banner tone="warn" icon={Lock} title="Free Snap imports used up for this cycle" action={<Link to="/settings/unlock" className="btn btn-primary btn-sm">See lifetime unlock</Link>}>
            You can still add expenses by hand, and your data and exports stay free.
          </Banner>
        )}

        <SegmentedKind value={kind} onChange={setKind} />

        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className={`btn btn-mint cursor-pointer ${blocked ? 'pointer-events-none opacity-50' : ''}`}>
            <Camera size={22} strokeWidth={1.9} aria-hidden /> Take photo
            <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={blocked} onChange={(e) => { load(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <label className={`btn btn-secondary cursor-pointer ${blocked ? 'pointer-events-none opacity-50' : ''}`}>
            <ImageIcon size={22} strokeWidth={1.75} aria-hidden /> From gallery
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={blocked} onChange={(e) => { load(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>

        {image && (
          <section className="card mb-4 p-4" aria-label="Image preview">
            <canvas ref={canvas} className="mx-auto mb-3 max-h-[46dvh] max-w-full rounded-md border border-line" role="img" aria-label="Preview of the selected image" />
            <details className="mb-3">
              <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-primary">Trim the image (optional)</summary>
              <div className="grid grid-cols-2 gap-x-4 pt-2">
                {slider('top', 'top')}
                {slider('bottom', 'bottom')}
                {slider('left', 'left')}
                {slider('right', 'right')}
              </div>
            </details>
            {progress !== null ? (
              <div role="status">
                <p className="mb-1.5 text-sm text-muted">{ready ? 'Reading…' : 'Preparing and reading… the first time takes longer'} {Math.round(progress * 100)}%</p>
                <ProgressBar percent={progress * 100} label="Reading progress" />
              </div>
            ) : (
              <button type="button" className="btn btn-primary w-full" onClick={read}>
                Read this image
              </button>
            )}
          </section>
        )}

        {ready === false && (
          <div className="card mb-4 flex items-start gap-3 p-4">
            <CloudDownload size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Get ready for offline use</p>
              <p className="mb-3 text-sm text-muted">The first scan downloads about {OCR_DOWNLOAD_MB} MB of text-reading files, then they are saved on this device so scanning works without internet.</p>
              {downloading === null ? (
                <button type="button" className="btn btn-soft btn-sm" onClick={prepare}>Download now</button>
              ) : (
                <ProgressBar percent={downloading * 100} label="Download progress" />
              )}
            </div>
          </div>
        )}
        {ready === true && <p className="mb-4 text-sm text-teal">Text reading is saved on this device and works offline.</p>}

        <Link to="/activity/new" className="btn btn-secondary w-full">
          Enter manually instead
        </Link>
      </Page>
    </>
  );
}

async function fetchSharedFromCache(): Promise<File | null> {
  try {
    const cache = await caches.open('gastador-share');
    const res = await cache.match('/shared-image');
    if (!res) return null;
    const blob = await res.blob();
    await cache.delete('/shared-image');
    return new File([blob], 'shared-image', { type: blob.type });
  } catch {
    return null;
  }
}
