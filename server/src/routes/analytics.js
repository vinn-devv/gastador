import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { asyncRoute, httpError } from '../lib/http.js';
import { dateDiffInclusive } from '../lib/money.js';

const router = Router();
router.get('/', asyncRoute(async (req, res) => {
  const { from, to } = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
  const days = dateDiffInclusive(from, to);
  if (days < 1 || days > 400) throw httpError(400, 'invalid_range');
  const [totals, daily, categories, methods] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id=$1 AND (occurred_at AT TIME ZONE 'Asia/Manila')::date BETWEEN $2 AND $3`, [req.userId,from,to]),
    pool.query(`SELECT (occurred_at AT TIME ZONE 'Asia/Manila')::date::text AS date,SUM(amount) AS total
      FROM transactions WHERE user_id=$1 AND (occurred_at AT TIME ZONE 'Asia/Manila')::date BETWEEN $2 AND $3
      GROUP BY 1 ORDER BY 1`, [req.userId,from,to]),
    pool.query(`SELECT c.id,c.name,SUM(t.amount) AS total FROM transactions t JOIN categories c ON c.id=t.category_id AND c.user_id=t.user_id
      WHERE t.user_id=$1 AND (t.occurred_at AT TIME ZONE 'Asia/Manila')::date BETWEEN $2 AND $3
      GROUP BY c.id,c.name ORDER BY SUM(t.amount) DESC`, [req.userId,from,to]),
    pool.query(`SELECT payment_method,SUM(amount) AS total FROM transactions
      WHERE user_id=$1 AND (occurred_at AT TIME ZONE 'Asia/Manila')::date BETWEEN $2 AND $3
      GROUP BY payment_method ORDER BY SUM(amount) DESC`, [req.userId,from,to])
  ]);
  const total = Number(totals.rows[0].total);
  res.json({
    total: Number.isFinite(total) ? total.toFixed(2) : '0.00',
    average_daily: (total / days).toFixed(2),
    highest_category: categories.rows[0] ? { name: categories.rows[0].name, total: categories.rows[0].total } : null,
    daily: daily.rows,
    by_category: categories.rows,
    by_payment_method: methods.rows
  });
}));
export default router;
