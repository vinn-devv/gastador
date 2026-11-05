import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import { createBillingRouter } from '../src/routes/billing.js';
import { loadConfig, signJwt, verifyPurchase } from '../src/billing/playVerify.js';

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const account = { client_email: 'svc@example.iam.gserviceaccount.com', private_key: privateKey };
const env = { PLAY_PACKAGE_NAME: 'ph.gastador.app', PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify(account) };

function fakeGoogle({ purchase, status = 200 }) {
  const calls = [];
  const fetcher = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? 'GET' });
    if (String(url).includes('oauth2.googleapis.com')) return new Response(JSON.stringify({ access_token: 'at' }), { status: 200 });
    if (String(url).endsWith(':acknowledge')) return new Response('{}', { status: 200 });
    return new Response(JSON.stringify(purchase), { status });
  };
  return { fetcher, calls };
}

async function call(router, body) {
  const app = express();
  app.use(express.json());
  app.use('/api/billing', router);
  const server = app.listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/billing/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

test('configuration is read only when complete', () => {
  assert.equal(loadConfig({}), null);
  assert.equal(loadConfig({ PLAY_PACKAGE_NAME: 'x', PLAY_SERVICE_ACCOUNT_JSON: '{bad' }), null);
  assert.ok(loadConfig(env));
});

test('JWT assertions are signed RS256 and verifiable', () => {
  const jwt = signJwt(account, 1000);
  const [h, c, s] = jwt.split('.');
  assert.equal(JSON.parse(Buffer.from(h, 'base64url')).alg, 'RS256');
  assert.equal(JSON.parse(Buffer.from(c, 'base64url')).exp, 4600);
  const publicKey = crypto.createPublicKey(privateKey);
  assert.ok(crypto.verify('RSA-SHA256', Buffer.from(`${h}.${c}`), publicKey, Buffer.from(s, 'base64url')));
});

test('an unconfigured server never verifies anything', async () => {
  const res = await call(createBillingRouter({ env: {} }), { productId: 'gastador_lifetime', purchaseToken: 'abcdefghijklmnop' });
  assert.equal(res.status, 503);
  assert.equal(res.body.verified, false);
});

test('malformed requests are rejected before any store call', async () => {
  const router = createBillingRouter({ env, fetcher: async () => { throw new Error('should not be called'); } });
  for (const body of [{}, { productId: 'gastador_lifetime' }, { productId: 'gastador_lifetime', purchaseToken: 'short' }, { productId: 5, purchaseToken: 'abcdefghijklmnop' }]) {
    assert.equal((await call(router, body)).status, 400);
  }
});

test('a purchased item is verified and acknowledged', async () => {
  const google = fakeGoogle({ purchase: { purchaseState: 0, acknowledgementState: 0 } });
  const res = await call(createBillingRouter({ env, fetcher: google.fetcher }), { productId: 'gastador_lifetime', purchaseToken: 'abcdefghijklmnop' });
  assert.deepEqual(res.body, { verified: true });
  assert.ok(google.calls.some((c) => c.url.endsWith(':acknowledge') && c.method === 'POST'));
});

test('cancelled, pending, unknown, and other-product purchases are not verified', async () => {
  const cancelled = fakeGoogle({ purchase: { purchaseState: 1, acknowledgementState: 1 } });
  assert.equal((await verifyPurchase(loadConfig(env), { productId: 'gastador_lifetime', purchaseToken: 'abcdefghijklmnop' }, cancelled.fetcher)).verified, false);
  const missing = fakeGoogle({ purchase: {}, status: 404 });
  assert.equal((await verifyPurchase(loadConfig(env), { productId: 'gastador_lifetime', purchaseToken: 'abcdefghijklmnop' }, missing.fetcher)).reason, 'not_found');
  const other = fakeGoogle({ purchase: { purchaseState: 0 } });
  assert.equal((await verifyPurchase(loadConfig(env), { productId: 'something_else', purchaseToken: 'abcdefghijklmnop' }, other.fetcher)).reason, 'unknown_product');
  assert.equal(other.calls.length, 0);
});

test('store outages surface as 502 and never as verified', async () => {
  const router = createBillingRouter({ env, fetcher: async () => new Response('x', { status: 500 }) });
  const res = await call(router, { productId: 'gastador_lifetime', purchaseToken: 'abcdefghijklmnop' });
  assert.equal(res.status, 502);
  assert.equal(res.body.verified, false);
});
