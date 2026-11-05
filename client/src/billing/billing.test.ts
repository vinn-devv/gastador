import { describe, expect, it, vi } from 'vitest';
import { canAddGoal, canImportMore, FREE_LIMITS, isUnlocked, maxInsightsDays } from './features';
import { createNoneProvider, createTestProvider, resolveKind, verifyPurchaseToken } from './providers';
import type { Entitlement } from './types';

const testEntitlement: Entitlement = { productId: 'gastador_lifetime', source: 'test', grantedAt: '2026-11-01T00:00:00.000Z', verifiedAt: null };
const playVerified: Entitlement = { productId: 'gastador_lifetime', source: 'play', grantedAt: '2026-11-01T00:00:00.000Z', verifiedAt: '2026-11-01T00:00:00.000Z', purchaseToken: 't' };
const playUnverified: Entitlement = { ...playVerified, verifiedAt: null };

describe('unlock policy', () => {
  it('never locks anything while billing is not enforced', () => {
    const ctx = { entitlement: null, enforcement: false, production: true };
    expect(isUnlocked(ctx)).toBe(true);
    expect(canImportMore(ctx, 9999)).toBe(true);
  });

  it('applies free limits when enforcement is on and nothing is unlocked', () => {
    const ctx = { entitlement: null, enforcement: true, production: false };
    expect(canImportMore(ctx, FREE_LIMITS.snapImportsPerCycle - 1)).toBe(true);
    expect(canImportMore(ctx, FREE_LIMITS.snapImportsPerCycle)).toBe(false);
    expect(canAddGoal(ctx, FREE_LIMITS.savingsGoals)).toBe(false);
    expect(maxInsightsDays(ctx)).toBe(FREE_LIMITS.insightsMaxDays);
  });

  it('honours a verified Play purchase', () => {
    const ctx = { entitlement: playVerified, enforcement: true, production: true };
    expect(isUnlocked(ctx)).toBe(true);
    expect(canAddGoal(ctx, 50)).toBe(true);
    expect(maxInsightsDays(ctx)).toBeGreaterThan(366);
  });

  it('does not honour an unverified Play record', () => {
    expect(isUnlocked({ entitlement: playUnverified, enforcement: true, production: true })).toBe(false);
  });

  it('never honours a test entitlement in production', () => {
    expect(isUnlocked({ entitlement: testEntitlement, enforcement: true, production: true })).toBe(false);
    expect(isUnlocked({ entitlement: testEntitlement, enforcement: true, production: false })).toBe(true);
  });
});

describe('provider selection', () => {
  it('refuses test mode in production builds', () => {
    expect(resolveKind({ mode: 'test', production: true, verifyUrl: '' })).toBe('none');
    expect(resolveKind({ mode: 'test', production: false, verifyUrl: '' })).toBe('test');
    expect(resolveKind({ mode: 'play', production: true, verifyUrl: 'x' })).toBe('play');
    expect(resolveKind({ mode: '', production: true, verifyUrl: '' })).toBe('none');
  });

  it('an unconfigured build cannot purchase or restore', async () => {
    const p = createNoneProvider();
    expect((await p.status()).canPurchase).toBe(false);
    expect(await p.purchase()).toMatchObject({ ok: false, code: 'unavailable' });
    expect(await p.restore()).toMatchObject({ ok: false, code: 'unavailable' });
  });

  it('test provider only restores test entitlements', async () => {
    const none = createTestProvider({ get: async () => null });
    expect(await none.restore()).toMatchObject({ ok: false, code: 'nothing_to_restore' });
    const granted = createTestProvider({ get: async () => testEntitlement });
    expect(await granted.restore()).toMatchObject({ ok: true });
    expect((await granted.status()).reason).toContain('Test mode');
  });
});

describe('purchase verification', () => {
  it('only accepts an explicit verified: true from the server', async () => {
    const ok = vi.fn().mockResolvedValue(new Response(JSON.stringify({ verified: true }), { status: 200 }));
    expect(await verifyPurchaseToken('https://v.example/verify', 'tok', ok)).toBe(true);
    const body = JSON.parse(ok.mock.calls[0][1].body);
    expect(body).toEqual({ productId: 'gastador_lifetime', purchaseToken: 'tok' });
    for (const res of [new Response('{}', { status: 200 }), new Response('{"verified":"true"}', { status: 200 }), new Response('{"verified":true}', { status: 500 }), new Response('not json', { status: 200 })]) {
      expect(await verifyPurchaseToken('https://v.example/verify', 'tok', vi.fn().mockResolvedValue(res))).toBe(false);
    }
  });
});
