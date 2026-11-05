import express from 'express';
import { loadConfig, verifyPurchase } from '../billing/playVerify.js';

const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}

export function createBillingRouter({ env = process.env, fetcher = fetch } = {}) {
  const router = express.Router();
  router.post('/verify', async (req, res) => {
    if (limited(req.ip)) return res.status(429).json({ verified: false, error: 'rate_limited' });
    const { productId, purchaseToken } = req.body ?? {};
    if (typeof productId !== 'string' || typeof purchaseToken !== 'string' || purchaseToken.length < 10 || purchaseToken.length > 2048) {
      return res.status(400).json({ verified: false, error: 'invalid_request' });
    }
    const config = loadConfig(env);
    if (!config) return res.status(503).json({ verified: false, error: 'not_configured' });
    try {
      const result = await verifyPurchase(config, { productId, purchaseToken }, fetcher);
      return res.json(result);
    } catch {
      return res.status(502).json({ verified: false, error: 'store_unavailable' });
    }
  });
  return router;
}

export default createBillingRouter();
