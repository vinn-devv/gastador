import { deleteOne, getOne, putOne } from '../data/db';
import { ensureReady } from '../data/repo';
import { createNoneProvider, createPlayProvider, createTestProvider, readBillingEnv, resolveKind } from './providers';
import type { BillingProvider, Entitlement } from './types';

interface Record_ {
  key: 'entitlement';
  value: Entitlement;
}

export const entitlementStore = {
  async get(): Promise<Entitlement | null> {
    await ensureReady();
    return (await getOne<Record_>('settings', 'entitlement'))?.value ?? null;
  },
  async set(value: Entitlement): Promise<void> {
    await ensureReady();
    await putOne('settings', { key: 'entitlement', value } satisfies Record_);
  },
  async clear(): Promise<void> {
    await deleteOne('settings', 'entitlement');
  }
};

export function createProvider(): BillingProvider {
  const env = readBillingEnv();
  const kind = resolveKind(env);
  if (kind === 'test') return createTestProvider(entitlementStore);
  if (kind === 'play') return createPlayProvider(env);
  return createNoneProvider();
}
