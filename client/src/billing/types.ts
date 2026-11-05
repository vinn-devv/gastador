export type BillingKind = 'none' | 'test' | 'play';

export interface Entitlement {
  productId: string;
  source: 'test' | 'play';
  grantedAt: string;
  verifiedAt: string | null;
  purchaseToken?: string;
}

export interface BillingStatus {
  kind: BillingKind;
  canPurchase: boolean;
  reason: string | null;
  priceLabel: string;
}

export type PurchaseOutcome =
  | { ok: true; entitlement: Entitlement }
  | { ok: false; code: 'unavailable' | 'cancelled' | 'unverified' | 'network' | 'nothing_to_restore'; message: string };

export interface BillingProvider {
  kind: BillingKind;
  status(): Promise<BillingStatus>;
  purchase(): Promise<PurchaseOutcome>;
  restore(): Promise<PurchaseOutcome>;
}

export const PRODUCT_ID = 'gastador_lifetime';
export const LIST_PRICE_CENTAVOS = 9900;
