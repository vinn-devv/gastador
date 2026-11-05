import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { requireAuth } from './auth.js';
import { errorHandler } from './http.js';
import { publicRouter, meRouter } from './routes/auth.js';
import budget from './routes/budget.js';
import categories from './routes/categories.js';
import transactions from './routes/transactions.js';
import savings from './routes/savings.js';
import analytics from './routes/analytics.js';
import billing from './routes/billing.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    });
    next();
  });
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', publicRouter);
  app.use('/api/billing', billing);
  app.use('/api', requireAuth);
  app.use('/api/me', meRouter);
  app.use('/api/cycles', budget);
  app.use('/api/categories', categories);
  app.use('/api/transactions', transactions);
  app.use('/api/savings', savings);
  app.use('/api/analytics', analytics);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { etag: true, maxAge: '1h' }));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use(errorHandler);
  return app;
}
