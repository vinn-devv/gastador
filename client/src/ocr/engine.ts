const OCR_CACHE = 'gastador-ocr-v1';

export interface OcrResult {
  text: string;
  confidence: number;
}

function base(): string {
  return `${location.origin}${import.meta.env.BASE_URL}tesseract`;
}

export const OCR_ASSET_PATHS = {
  worker: () => `${base()}/worker.min.js`,
  coreSimd: () => `${base()}/core/tesseract-core-simd-lstm.wasm.js`,
  core: () => `${base()}/core/tesseract-core-lstm.wasm.js`,
  lang: () => `${base()}/lang/eng.traineddata.gz`
};

export const OCR_DOWNLOAD_MB = 7;

async function simdSupported(): Promise<boolean> {
  try {
    const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
    return WebAssembly.validate(bytes);
  } catch {
    return false;
  }
}

export async function ocrAssetUrls(): Promise<string[]> {
  const core = (await simdSupported()) ? OCR_ASSET_PATHS.coreSimd() : OCR_ASSET_PATHS.core();
  return [OCR_ASSET_PATHS.worker(), core, OCR_ASSET_PATHS.lang()];
}

export async function isOcrReadyOffline(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open(OCR_CACHE);
    const urls = await ocrAssetUrls();
    const hits = await Promise.all(urls.map((u) => cache.match(u)));
    return hits.every(Boolean);
  } catch {
    return false;
  }
}

export async function downloadOcrAssets(onProgress: (fraction: number) => void): Promise<void> {
  if (typeof caches === 'undefined') throw new Error('Offline storage is not available in this browser.');
  const cache = await caches.open(OCR_CACHE);
  const urls = await ocrAssetUrls();
  for (const [i, url] of urls.entries()) {
    if (!(await cache.match(url))) {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not download the text-reading files. Check your connection and try again.');
      await cache.put(url, response);
    }
    onProgress((i + 1) / urls.length);
  }
}

export async function recognize(canvas: HTMLCanvasElement, onProgress: (fraction: number) => void): Promise<OcrResult> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    workerPath: OCR_ASSET_PATHS.worker(),
    corePath: `${base()}/core/`,
    langPath: `${base()}/lang`,
    gzip: true,
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress(m.progress);
    }
  });
  try {
    await worker.setParameters({ preserve_interword_spaces: '1' });
    const { data } = await worker.recognize(canvas);
    return { text: data.text, confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}
