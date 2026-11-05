import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { asyncRoute, httpError } from '../lib/http.js';
import { createSession, clearSessionCookie, hashPassword, verifyPassword } from '../auth.js';

export const publicRouter = Router();
export const meRouter = Router();

const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(200),
  display_name: z.string().trim().min(1).max(80)
});
const loginSchema = z.object({ email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()), password: z.string().min(1).max(200) });
const DEFAULT_CATEGORIES = [
  'Food and Drinks', 'Transportation', 'School Expenses', 'Bills and Utilities',
  'Health and Personal Care', 'Entertainment', 'Shopping', 'Others', 'Savings'
];

const authWindows = new Map();
function authRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  let record = authWindows.get(key);
  if (!record || record.resetAt <= now) record = { count: 0, resetAt: now + windowMs };
  record.count += 1;
  authWindows.set(key, record);
  if (authWindows.size > 5000) {
    for (const [ip, item] of authWindows) if (item.resetAt <= now) authWindows.delete(ip);
  }
  if (record.count > 20) {
    res.setHeader('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'too_many_attempts' });
  }
  next();
}

publicRouter.post('/register', authRateLimit, asyncRoute(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const passwordHash = await hashPassword(input.password);
  const client = await pool.connect();
  let user;
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO users(email,password_hash,display_name) VALUES ($1,$2,$3) RETURNING id,email,display_name',
      [input.email, passwordHash, input.display_name]
    );
    user = result.rows[0];
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      await client.query('INSERT INTO categories(user_id,name,sort_order,is_savings) VALUES ($1,$2,$3,$4)', [user.id, DEFAULT_CATEGORIES[i], i, DEFAULT_CATEGORIES[i] === 'Savings']);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw httpError(409, 'email_taken');
    throw error;
  } finally { client.release(); }
  await createSession(user.id, res);
  res.status(201).json({ ok: true });
}));

publicRouter.post('/login', authRateLimit, asyncRoute(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const { rows } = await pool.query('SELECT id,password_hash FROM users WHERE email=$1', [input.email]);
  if (!rows[0] || !(await verifyPassword(input.password, rows[0].password_hash))) throw httpError(401, 'invalid_credentials');
  await createSession(rows[0].id, res);
  res.json({ ok: true });
}));

publicRouter.post('/logout', asyncRoute(async (req, res) => {
  const raw = req.headers.cookie || '';
  const pair = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith('gastador_session='));
  if (pair) {
    let token = '';
    try { token = decodeURIComponent(pair.slice('gastador_session='.length)); } catch { /* malformed cookie */ }
    if (token) {
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      await pool.query('DELETE FROM sessions WHERE token_hash=$1', [hash]);
    }
  }
  clearSessionCookie(res);
  res.json({ ok: true });
}));

meRouter.get('/', asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id,email,display_name,currency,timezone,theme,budget_method,onboarding_completed,biometric_enabled,notifications
     FROM users WHERE id=$1`, [req.userId]
  );
  if (!rows[0]) throw httpError(401, 'unauthenticated');
  const u = rows[0];
  res.json({
    user: { id: u.id, email: u.email, display_name: u.display_name },
    preferences: {
      currency: u.currency, timezone: u.timezone, theme: u.theme, budget_method: u.budget_method,
      onboarding_completed: u.onboarding_completed, biometric_enabled: u.biometric_enabled
    },
    notifications: u.notifications
  });
}));

meRouter.patch('/', asyncRoute(async (req, res) => {
  const body = z.object({ display_name: z.string().trim().min(1).max(80) }).strict().parse(req.body);
  const { rows } = await pool.query('UPDATE users SET display_name=$1 WHERE id=$2 RETURNING display_name', [body.display_name, req.userId]);
  res.json(rows[0]);
}));

meRouter.patch('/preferences', asyncRoute(async (req, res) => {
  const schema = z.object({
    currency: z.enum(['PHP','USD','EUR','JPY','SGD']).optional(),
    timezone: z.string().min(1).max(80).optional(),
    theme: z.enum(['light','dark','system']).optional(),
    budget_method: z.enum(['daily_pace','category_limits','simple_total']).optional(),
    onboarding_completed: z.boolean().optional(),
    biometric_enabled: z.boolean().optional()
  }).strict();
  const body = schema.parse(req.body);
  const fields = Object.entries(body);
  if (!fields.length) return res.json({ ok: true });
  const allowed = new Set(['currency','timezone','theme','budget_method','onboarding_completed','biometric_enabled']);
  const sets = fields.filter(([k]) => allowed.has(k)).map(([k], i) => `${k}=$${i+1}`);
  const values = fields.map(([,v]) => v);
  values.push(req.userId);
  const { rows } = await pool.query(`UPDATE users SET ${sets.join(',')} WHERE id=$${values.length} RETURNING currency,timezone,theme,budget_method,onboarding_completed,biometric_enabled`, values);
  res.json(rows[0]);
}));

meRouter.patch('/notifications', asyncRoute(async (req, res) => {
  const schema = z.object({
    daily_reminder: z.boolean().optional(), daily_reminder_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/).optional(),
    budget_50: z.boolean().optional(), budget_75: z.boolean().optional(), budget_90: z.boolean().optional(), budget_100: z.boolean().optional(),
    category_overspend: z.boolean().optional(), cycle_ending_soon: z.boolean().optional(),
    cycle_ending_days: z.number().int().min(1).max(14).optional(), savings_progress: z.boolean().optional()
  }).strict();
  const body = schema.parse(req.body);
  const { rows } = await pool.query('UPDATE users SET notifications=notifications || $1::jsonb WHERE id=$2 RETURNING notifications', [JSON.stringify(body), req.userId]);
  res.json({ notifications: rows[0].notifications });
}));

meRouter.post('/password', asyncRoute(async (req, res) => {
  const body = z.object({ current_password: z.string().min(1), new_password: z.string().min(8).max(200) }).strict().parse(req.body);
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.userId]);
  if (!rows[0] || !(await verifyPassword(body.current_password, rows[0].password_hash))) throw httpError(401, 'invalid_credentials');
  const newHash = await hashPassword(body.new_password);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, req.userId]);
  await pool.query('DELETE FROM sessions WHERE user_id=$1 AND token_hash <> $2', [req.userId, req.sessionTokenHash]);
  res.json({ ok: true });
}));

meRouter.get('/export', asyncRoute(async (req, res) => {
  const [user, categories, cycles, cycleBudgets, transactions, receipts, savings, contributions] = await Promise.all([
    pool.query('SELECT id,email,display_name,currency,timezone,theme,budget_method,onboarding_completed,biometric_enabled,notifications,created_at FROM users WHERE id=$1', [req.userId]),
    pool.query('SELECT * FROM categories WHERE user_id=$1 ORDER BY sort_order,name', [req.userId]),
    pool.query('SELECT * FROM budget_cycles WHERE user_id=$1 ORDER BY start_date', [req.userId]),
    pool.query('SELECT * FROM cycle_category_budgets WHERE user_id=$1 ORDER BY cycle_id,category_id', [req.userId]),
    pool.query('SELECT * FROM transactions WHERE user_id=$1 ORDER BY occurred_at', [req.userId]),
    pool.query('SELECT id,transaction_id,file_name,mime_type,size_bytes,sha256,created_at FROM transaction_receipts WHERE user_id=$1 ORDER BY created_at', [req.userId]),
    pool.query('SELECT * FROM savings_goals WHERE user_id=$1 ORDER BY created_at', [req.userId]),
    pool.query('SELECT * FROM savings_contributions WHERE user_id=$1 ORDER BY contributed_at', [req.userId])
  ]);
  res.json({ exported_at: new Date().toISOString(), user: user.rows[0], categories: categories.rows, cycles: cycles.rows, cycle_category_budgets: cycleBudgets.rows, transactions: transactions.rows, receipts: receipts.rows, savings_goals: savings.rows, savings_contributions: contributions.rows });
}));

meRouter.delete('/', asyncRoute(async (req, res) => {
  const body = z.object({ password: z.string().min(1) }).strict().parse(req.body);
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.userId]);
  if (!rows[0] || !(await verifyPassword(body.password, rows[0].password_hash))) throw httpError(401, 'invalid_credentials');
  await pool.query('DELETE FROM users WHERE id=$1', [req.userId]);
  clearSessionCookie(res);
  res.json({ ok: true });
}));
