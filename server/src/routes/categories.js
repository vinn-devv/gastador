import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { asyncRoute, httpError } from '../lib/http.js';

const router = Router();
router.get('/', asyncRoute(async (req, res) => {
  const includeArchived = req.query.include_archived === 'true';
  const { rows } = await pool.query(
    `SELECT id,name,is_savings,sort_order,archived_at FROM categories
     WHERE user_id=$1 AND ($2::boolean OR archived_at IS NULL)
     ORDER BY is_savings,sort_order,name`, [req.userId, includeArchived]
  );
  res.json({ categories: rows });
}));

router.post('/', asyncRoute(async (req, res) => {
  const body = z.object({ name: z.string().trim().min(1).max(50) }).strict().parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO categories(user_id,name,sort_order) VALUES($1,$2,COALESCE((SELECT MAX(sort_order)+1 FROM categories WHERE user_id=$1),0))
     RETURNING id,name,is_savings,sort_order,archived_at`, [req.userId, body.name]
  );
  res.status(201).json(rows[0]);
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const body = z.object({ name: z.string().trim().min(1).max(50).optional(), archived: z.boolean().optional() }).strict().refine((b) => Object.keys(b).length > 0).parse(req.body);
  const { rows } = await pool.query(
    `UPDATE categories SET
       name=COALESCE($1,name),
       archived_at=CASE WHEN $2::boolean IS NULL THEN archived_at WHEN $2 THEN COALESCE(archived_at,now()) ELSE NULL END
     WHERE id=$3 AND user_id=$4 AND (NOT is_savings OR $2 IS NULL OR $2=false)
     RETURNING id,name,is_savings,sort_order,archived_at`,
    [body.name ?? null, body.archived ?? null, req.params.id, req.userId]
  );
  if (!rows[0]) throw httpError(404, 'not_found');
  res.json(rows[0]);
}));

export default router;
