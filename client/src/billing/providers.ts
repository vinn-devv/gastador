import { LIST_PRICE_CENTAVOS, PRODUCT_ID, type BillingKind, type BillingProvider, type BillingStatus, type Entitlement, type PurchaseOutcome } from './types';
import { formatMoneyCompact } from '../domain/money';

const priceLabel = formatMoneyCompact(LIST_PRICE_CENTAVOS);

export interface BillingEnv {
  mode: string;
  production: boolean;
  verifyUrl: string;
}

export function readBillingEnv(): BillingEnv {
  return {
    mode: String(import.meta.env.VITE_BILLING_MODE ?? 'none'),
    production: import.meta.env.PROD === true,
    verifyUrl: String(import.meta.env.VITE_PLAY_VERIFY_URL ?? '')
  };
}

export function resolveKind(env: BillingEnv): BillingKind {
  if (env.mode === 'test') return env.production ? 'none' : 'test';
  if (env.mode === 'play') return 'play';
  return 'none';
}

export function createNoneProvider(reason = 'Purchases are not set up in this build of Gastador.'): BillingProvider {
  const outcome = { ok: false as const, code: 'unavailable' as const, message: reason };
  return {
    kind: 'none',
    status: async (): Promise<BillingStatus> => ({ kind: 'none', canPurchase: false, reason, priceLabel }),
    purchase: async () => outcome,
    restore: async () => outcome
  };
}

export function createTestProvider(store: { get(): Promise<Entitlement | null> }): BillingProvider {
  const grant = (): Entitlement => ({ productId: PRODUCT_ID, source: 'test', grantedAt: new Date().toISOString(), verifiedAt: null });
  return {
    kind: 'test',
    status: async () => ({ kind: 'test', canPurchase: true, reason: 'Test mode. Nothing is charged and this unlock only works in development builds.', priceLabel }),
    purchase: async (): Promise<PurchaseOutcome> => ({ ok: true, entitlement: grant() }),
    restore: async (): Promise<PurchaseOutcome> => {
      const existing = await store.get();
      return existing?.source === 'test'
        ? { ok: true, entitlement: existing }
        : { ok: false, code: 'nothing_to_restore', message: 'No test purchase was found on this device.' };
    }
  };
}

interface DigitalGoodsService {
  getDetails(ids: string[]): Promise<{ itemId: string; price: { currency: string; value: string } }[]>;
  listPurchases(): Promise<{ itemId: string; purchaseToken: string }[]>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function verifyPurchaseToken(verifyUrl: string, purchaseToken: string, fetcher: FetchLike = fetch): Promise<boolean> {
  const response = await fetcher(verifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: PRODUCT_ID, purchaseToken })
  });
  if (!response.ok) return false;
  const body = (await response.json().catch(() => null)) as { verified?: unknown } | null;
  return body?.verified === true;
}

export function createPlayProvider(env: BillingEnv, fetcher: FetchLike = fetch): BillingProvider {
  const getService = async (): Promise<DigitalGoodsService | null> => {
    const w = window as unknown as { getDigitalGoodsService?: (url: string) => Promise<DigitalGoodsService> };
    if (typeof w.getDigitalGoodsService !== 'function') return null;
    try {
      return await w.getDigitalGoodsService('https://play.google.com/billing');
    } catch {
      return null;
    }
  };
  const unavailable = (message: string) => ({ ok: false as const, code: 'unavailable' as const, message });
  const noVerifier = !env.verifyUrl;

  const finish = async (token: string): Promise<PurchaseOutcome> => {
    try {
      const verified = await verifyPurchaseToken(env.verifyUrl, token, fetcher);
      if (!verified) return { ok: false, code: 'unverified', message: 'Google Play could not confirm this purchase yet. If you were charged, tap Restore purchases in a few minutes.' };
      const now = new Date().toISOString();
      return { ok: true, entitlement: { productId: PRODUCT_ID, source: 'play', grantedAt: now, verifiedAt: now, purchaseToken: token } };
    } catch {
      return { ok: false, code: 'network', message: 'Could not reach the verification service. Check your connection and try again.' };
    }
  };

  return {
    kind: 'play',
    status: async (): Promise<BillingStatus> => {
      if (noVerifier) return { kind: 'play', canPurchase: false, reason: 'Purchase verification is not configured for this build.', priceLabel };
      const service = await getService();
      if (!service) return { kind: 'play', canPurchase: false, reason: 'Purchases are available in the Google Play version of Gastador.', priceLabel };
      try {
        const [details] = await service.getDetails([PRODUCT_ID]);
        if (details?.price?.currency === 'PHP') return { kind: 'play', canPurchase: true, reason: null, priceLabel: formatMoneyCompact(Math.round(Number(details.price.value) * 100)) };
      } catch {
        return { kind: 'play', canPurchase: true, reason: null, priceLabel };
      }
      return { kind: 'play', canPurchase: true, reason: null, priceLabel };
    },
    purchase: async (): Promise<PurchaseOutcome> => {
      if (noVerifier) return unavailable('Purchase verification is not configured for this build.');
      const service = await getService();
      if (!service) return unavailable('Purchases are available in the Google Play version of Gastador.');
      try {
        const request = new PaymentRequest(
          [{ supportedMethods: 'https://play.google.com/billing', data: { sku: PRODUCT_ID } }],
          { total: { label: 'Gastador lifetime unlock', amount: { currency: 'PHP', value: (LIST_PRICE_CENTAVOS / 100).toFixed(2) } } }
        );
        const response = await request.show();
        const token = (response.details as { purchaseToken?: string }).purchaseToken;
        if (!token) {
          await response.complete('fail');
          return { ok: false, code: 'unverified', message: 'Google Play did not return a purchase token.' };
        }
        const outcome = await finish(token);
        await response.complete(outcome.ok ? 'success' : 'fail');
        return outcome;
      } catch (error) {
        const name = (error as { name?: string })?.name;
        if (name === 'AbortError' || name === 'NotAllowedError') return { ok: false, code: 'cancelled', message: 'Purchase cancelled. You were not charged.' };
        return { ok: false, code: 'unavailable', message: 'Google Play could not start the purchase.' };
      }
    },
    restore: async (): Promise<PurchaseOutcome> => {
      if (noVerifier) return unavailable('Purchase verification is not configured for this build.');
      const service = await getService();
      if (!service) return unavailable('Restoring purchases works in the Google Play version of Gastador.');
      try {
        const purchases = (await service.listPurchases()).filter((p) => p.itemId === PRODUCT_ID);
        if (!purchases.length) return { ok: false, code: 'nothing_to_restore', message: 'No purchase was found for this Google account.' };
        return await finish(purchases[0].purchaseToken);
      } catch {
        return { ok: false, code: 'network', message: 'Could not check your purchases. Try again in a moment.' };
      }
    }
  };
}
