import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { asyncRoute, httpError } from '../lib/http.js';

const router = Router();
const goalSelect = `SELECT g.id,g.name,g.target_amount,g.target_date,
  COALESCE(SUM(c.amount),0) AS saved,
  GREATEST(g.target_amount-COALESCE(SUM(c.amount),0),0) AS remaining,
  CASE WHEN g.target_amount>0 THEN LEAST(100,ROUND(COALESCE(SUM(c.amount),0)/g.target_amount*100,2)) ELSE 0 END AS progress_percent
  FROM savings_goals g LEFT JOIN savings_contributions c ON c.goal_id=g.id AND c.user_id=g.user_id`;

router.get('/', asyncRoute(async (req, res) => {
  const { rows } = await pool.query(`${goalSelect} WHERE g.user_id=$1 GROUP BY g.id ORDER BY g.created_at DESC`, [req.userId]);
  res.json({ goals: rows });
}));

router.post('/', asyncRoute(async (req, res) => {
  const body = z.object({ name: z.string().trim().min(1).max(80), target_amount: z.number().finite().positive().max(9999999999.99), target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional() }).strict().parse(req.body);
  const { rows } = await pool.query('INSERT INTO savings_goals(user_id,name,target_amount,target_date) VALUES($1,$2,$3,$4) RETURNING id,name,target_amount,target_date', [req.userId,body.name,body.target_amount,body.target_date ?? null]);
  res.status(201).json(rows[0]);
}));

router.post('/:id/contributions', asyncRoute(async (req, res) => {
  const body = z.object({ amount: z.number().finite().positive().max(9999999999.99) }).strict().parse(req.body);
  const { rows: goal } = await pool.query('SELECT id FROM savings_goals WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  if (!goal[0]) throw httpError(404, 'not_found');
  const { rows } = await pool.query('INSERT INTO savings_contributions(user_id,goal_id,amount) VALUES($1,$2,$3) RETURNING id,goal_id,amount,contributed_at', [req.userId,req.params.id,body.amount]);
  res.status(201).json(rows[0]);
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const result = await pool.query('DELETE FROM savings_goals WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  if (!result.rowCount) throw httpError(404, 'not_found');
  res.status(204).end();
}));

export default router;
