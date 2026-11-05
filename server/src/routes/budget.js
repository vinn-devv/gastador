import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { asyncRoute, httpError } from '../lib/http.js';
import { cents, decimal, dateOnlyManila, dateDiffInclusive } from '../lib/money.js';

const router = Router();
const cycleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  frequency: z.enum(['weekly','biweekly','monthly','custom']),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_amount: z.number().finite().min(0).max(9999999999.99),
  savings_allocation: z.number().finite().min(0).optional()
}).refine((v) => v.end_date >= v.start_date, { path: ['end_date'], message: 'End date must not be before start date.' });

const spentSql = `COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.user_id=c.user_id AND (t.occurred_at AT TIME ZONE 'Asia/Manila')::date BETWEEN c.start_date AND c.end_date),0)`;

async function cycleList(userId) {
  const { rows } = await pool.query(
    `SELECT c.id,c.name,c.frequency,c.start_date,c.end_date,c.total_amount,c.carried_over_amount,c.savings_allocation,${spentSql} AS spent
     FROM budget_cycles c WHERE c.user_id=$1 ORDER BY c.start_date DESC,c.created_at DESC`, [userId]
  );
  return rows;
}

async function getSummary(userId, cycleId) {
  const { rows } = await pool.query(
    `SELECT c.id,c.name,c.frequency,c.start_date,c.end_date,c.total_amount,c.carried_over_amount,c.savings_allocation,
      ${spentSql} AS spent
     FROM budget_cycles c WHERE c.user_id=$1 AND c.id=$2`, [userId, cycleId]
  );
  const cycle = rows[0];
  if (!cycle) throw httpError(404, 'not_found');
  const totalDays = dateDiffInclusive(cycle.start_date, cycle.end_date);
  const today = dateOnlyManila();
  const daysElapsed = today < cycle.start_date ? 0 : Math.min(totalDays, dateDiffInclusive(cycle.start_date, today));
  const daysRemaining = today > cycle.end_date ? 0 : Math.max(0, dateDiffInclusive(today < cycle.start_date ? cycle.start_date : today, cycle.end_date));
  const spendableCents = cents(cycle.total_amount) + cents(cycle.carried_over_amount) - cents(cycle.savings_allocation);
  const spentCents = cents(cycle.spent);
  const remainingCents = spendableCents - spentCents;
  const elapsedSafe = Math.max(1, daysElapsed);
  const dailyTarget = totalDays > 0 ? Math.round(spendableCents / totalDays) : 0;
  const avgDaily = Math.round(spentCents / elapsedSafe);
  const projected = remainingCents - avgDaily * daysRemaining;
  const percent = spendableCents > 0 ? Math.max(0, Math.round((spentCents / spendableCents) * 10000) / 100) : (spentCents > 0 ? 100 : 0);
  const remainingPace = daysRemaining > 0 ? decimal(Math.round(remainingCents / daysRemaining)) : null;
  const status = remainingCents < 0 ? 'overspent' : (daysElapsed > 0 && spentCents > dailyTarget * daysElapsed ? 'over_pace' : 'on_track');
  const warningThreshold = [100,90,75,50].find((n) => percent >= n) ?? null;
  const { rows: categories } = await pool.query(
    `SELECT c.id,c.name,COALESCE(SUM(t.amount),0) AS spent,b.limit_amount,
      CASE WHEN b.limit_amount IS NOT NULL AND COALESCE(SUM(t.amount),0)>b.limit_amount THEN true ELSE false END AS over_limit
     FROM categories c
     LEFT JOIN transactions t ON t.category_id=c.id AND t.user_id=c.user_id AND (t.occurred_at AT TIME ZONE 'Asia/Manila')::date BETWEEN $2 AND $3
     LEFT JOIN cycle_category_budgets b ON b.category_id=c.id AND b.cycle_id=$4 AND b.user_id=c.user_id
     WHERE c.user_id=$1 AND c.archived_at IS NULL AND c.is_savings=false
     GROUP BY c.id,c.name,c.sort_order,b.limit_amount ORDER BY c.sort_order,c.name`,
    [userId, cycle.start_date, cycle.end_date, cycleId]
  );
  return {
    cycle,
    spendable_budget: decimal(spendableCents),
    spent: decimal(spentCents),
    remaining: decimal(remainingCents),
    percent_used: percent,
    warning_threshold: warningThreshold,
    pace: {
      total_days: totalDays, days_elapsed: daysElapsed, days_remaining: daysRemaining,
      original_daily_target: decimal(dailyTarget), remaining_daily_pace: remainingPace,
      actual_daily_average: decimal(avgDaily), projected_end_balance: decimal(projected), status
    },
    categories
  };
}

router.get('/', asyncRoute(async (req, res) => {
  res.json({ cycles: await cycleList(req.userId), today: dateOnlyManila() });
}));

router.get('/current', asyncRoute(async (req, res) => {
  const today = dateOnlyManila();
  const { rows } = await pool.query('SELECT id FROM budget_cycles WHERE user_id=$1 AND start_date <= $2 AND end_date >= $2 ORDER BY start_date DESC LIMIT 1', [req.userId, today]);
  if (!rows[0]) throw httpError(404, 'not_found');
  res.json(await getSummary(req.userId, rows[0].id));
}));

router.post('/', asyncRoute(async (req, res) => {
  const body = cycleSchema.parse(req.body);
  const savings = body.savings_allocation ?? 0;
  let carry = 0;
  if (req.body.carry_from_cycle_id) {
    const { rows } = await pool.query(
      `SELECT c.total_amount,c.carried_over_amount,c.savings_allocation,
       COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.user_id=c.user_id AND (t.occurred_at AT TIME ZONE 'Asia/Manila')::date BETWEEN c.start_date AND c.end_date),0) spent
       FROM budget_cycles c WHERE c.id=$1 AND c.user_id=$2`, [req.body.carry_from_cycle_id, req.userId]
    );
    if (!rows[0]) throw httpError(404, 'not_found');
    carry = Math.max(0, cents(rows[0].total_amount) + cents(rows[0].carried_over_amount) - cents(rows[0].savings_allocation) - cents(rows[0].spent)) / 100;
  }
  if (savings > body.total_amount + carry) throw httpError(400, 'invalid_range');
  const { rows } = await pool.query(
    `INSERT INTO budget_cycles(user_id,name,frequency,start_date,end_date,total_amount,carried_over_amount,savings_allocation)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id,name,frequency,start_date,end_date,total_amount,carried_over_amount,savings_allocation`,
    [req.userId, body.name, body.frequency, body.start_date, body.end_date, body.total_amount, carry, savings]
  );
  res.status(201).json(rows[0]);
}));

router.get('/:id', asyncRoute(async (req, res) => {
  res.json(await getSummary(req.userId, req.params.id));
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const body = cycleSchema.parse(req.body);
  const savings = body.savings_allocation ?? 0;
  const { rows } = await pool.query(
    `UPDATE budget_cycles SET name=$1,frequency=$2,start_date=$3,end_date=$4,total_amount=$5,savings_allocation=$6
     WHERE id=$7 AND user_id=$8 AND savings_allocation <= $5 + carried_over_amount
     RETURNING id,name,frequency,start_date,end_date,total_amount,carried_over_amount,savings_allocation`,
    [body.name,body.frequency,body.start_date,body.end_date,body.total_amount,savings,req.params.id,req.userId]
  );
  if (!rows[0]) throw httpError(404, 'not_found');
  res.json(rows[0]);
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const result = await pool.query('DELETE FROM budget_cycles WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  if (!result.rowCount) throw httpError(404, 'not_found');
  res.status(204).end();
}));

router.put('/:cycleId/category-budgets/:categoryId', asyncRoute(async (req, res) => {
  const body = z.object({ limit_amount: z.number().finite().min(0).max(9999999999.99).nullable() }).strict().parse(req.body);
  const { rows: valid } = await pool.query(
    'SELECT 1 FROM budget_cycles c JOIN categories g ON g.user_id=c.user_id WHERE c.id=$1 AND c.user_id=$2 AND g.id=$3 AND g.is_savings=false',
    [req.params.cycleId, req.userId, req.params.categoryId]
  );
  if (!valid[0]) throw httpError(404, 'not_found');
  if (body.limit_amount === null || body.limit_amount === 0) {
    await pool.query('DELETE FROM cycle_category_budgets WHERE user_id=$1 AND cycle_id=$2 AND category_id=$3', [req.userId, req.params.cycleId, req.params.categoryId]);
  } else {
    await pool.query(
      `INSERT INTO cycle_category_budgets(user_id,cycle_id,category_id,limit_amount) VALUES($1,$2,$3,$4)
       ON CONFLICT(cycle_id,category_id) DO UPDATE SET limit_amount=EXCLUDED.limit_amount`,
      [req.userId,req.params.cycleId,req.params.categoryId,body.limit_amount]
    );
  }
  res.json({ ok: true });
}));

export default router;
