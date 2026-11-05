import { normalizeName } from './categories';
import type { Centavos } from './money';
import type { PaymentMethod, Transaction } from './types';

export interface DuplicateCandidate {
  amountCentavos: Centavos;
  merchant: string;
  date: string;
  paymentMethod: PaymentMethod;
  externalReference: string | null;
}

export type DuplicateKind = 'reference' | 'likely';

export interface DuplicateMatch {
  kind: DuplicateKind;
  existing: Transaction;
}

function similarMerchant(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const shorter = x.length <= y.length ? x : y;
  const longer = x.length <= y.length ? y : x;
  return shorter.length >= 4 && longer.includes(shorter);
}

export function findDuplicate(txs: Transaction[], candidate: DuplicateCandidate, ignoreId?: string): DuplicateMatch | null {
  const others = txs.filter((t) => t.id !== ignoreId);
  if (candidate.externalReference) {
    const ref = candidate.externalReference.replace(/\s+/g, '');
    const hit = others.find(
      (t) => t.paymentMethod === candidate.paymentMethod && t.externalReference?.replace(/\s+/g, '') === ref
    );
    if (hit) return { kind: 'reference', existing: hit };
  }
  const likely = others.find(
    (t) => t.amountCentavos === candidate.amountCentavos && t.date === candidate.date && similarMerchant(t.merchant, candidate.merchant)
  );
  return likely ? { kind: 'likely', existing: likely } : null;
}
