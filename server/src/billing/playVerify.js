import crypto from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const PRODUCT_ID = 'gastador_lifetime';

const b64url = (input) => Buffer.from(input).toString('base64url');

export function loadConfig(env = process.env) {
  const packageName = env.PLAY_PACKAGE_NAME;
  const raw = env.PLAY_SERVICE_ACCOUNT_JSON;
  if (!packageName || !raw) return null;
  try {
    const account = JSON.parse(raw);
    if (!account.client_email || !account.private_key) return null;
    return { packageName, account };
  } catch {
    return null;
  }
}

export function signJwt(account, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), account.private_key).toString('base64url');
  return `${header}.${claims}.${signature}`;
}

async function accessToken(config, fetcher) {
  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signJwt(config.account) });
  const res = await fetcher(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) throw new Error('token_exchange_failed');
  return (await res.json()).access_token;
}

export async function verifyPurchase(config, { productId, purchaseToken }, fetcher = fetch) {
  if (productId !== PRODUCT_ID) return { verified: false, reason: 'unknown_product' };
  const token = await accessToken(config, fetcher);
  const base = `${API}/${encodeURIComponent(config.packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetcher(base, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404 || res.status === 410) return { verified: false, reason: 'not_found' };
  if (!res.ok) throw new Error('lookup_failed');
  const purchase = await res.json();
  if (purchase.purchaseState !== 0) return { verified: false, reason: 'not_purchased' };
  if (purchase.acknowledgementState === 0) {
    const ack = await fetcher(`${base}:acknowledge`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
    if (!ack.ok) throw new Error('acknowledge_failed');
  }
  return { verified: true };
}
