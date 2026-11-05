import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { asyncRoute, httpError } from '../lib/http.js';

const router = Router();
const methods = ['gcash','maya','cash','bank_transfer','other'];
const transactionSchema = z.object({
  amount: z.number().finite().positive().max(9999999999.99),
  merchant: z.string().trim().min(1).max(120),
  occurred_at: z.string().min(10).max(50).refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date and time.'),
  category_id: z.string().uuid(),
  payment_method: z.enum(methods),
  description: z.string().max(500).nullable().optional(),
  source: z.enum(['manual','screenshot','receipt']).optional(),
  ocr_status: z.enum(['not_applicable','succeeded','corrected','failed']).optional(),
  external_reference: z.string().trim().max(120).nullable().optional(),
  is_splurge: z.boolean().optional(),
  allow_duplicate: z.boolean().optional()
});
const txSelect = `SELECT t.id,t.amount,t.occurred_at,t.merchant,t.category_id,c.name AS category_name,t.payment_method,t.description,t.source,t.ocr_status,t.external_reference,t.is_splurge,t.created_at,t.updated_at
  FROM transactions t JOIN categories c ON c.id=t.category_id AND c.user_id=t.user_id`;

async function assertSpendCategory(userId, categoryId) {
  const { rows } = await pool.query('SELECT id,is_savings FROM categories WHERE id=$1 AND user_id=$2 AND archived_at IS NULL', [categoryId, userId]);
  if (!rows[0]) throw httpError(400, 'invalid_range');
  if (rows[0].is_savings) throw httpError(400, 'savings_category_not_allowed_use_contributions');
}

async function possibleDuplicate(userId, body, exceptId = null) {
  const { rows } = await pool.query(
    `${txSelect}
     WHERE t.user_id=$1 AND t.id IS DISTINCT FROM $2 AND t.amount=$3 AND lower(t.merchant)=lower($4)
       AND date_trunc('minute',t.occurred_at)=date_trunc('minute',$5::timestamptz)
     ORDER BY t.created_at DESC LIMIT 1`,
    [userId, exceptId, body.amount, body.merchant, body.occurred_at]
  );
  return rows[0] ?? null;
}

function buildWhere(req, startIndex = 1) {
  if (req.query.from && Number.isNaN(Date.parse(req.query.from))) throw httpError(400, 'invalid_range');
  if (req.query.to && Number.isNaN(Date.parse(req.query.to))) throw httpError(400, 'invalid_range');
  if (req.query.from && req.query.to && Date.parse(req.query.from) > Date.parse(req.query.to)) throw httpError(400, 'invalid_range');
  if (req.query.min_amount !== undefined && req.query.min_amount !== '' && !/^\d+(?:\.\d{1,2})?$/.test(String(req.query.min_amount))) throw httpError(400, 'invalid_range');
  if (req.query.max_amount !== undefined && req.query.max_amount !== '' && !/^\d+(?:\.\d{1,2})?$/.test(String(req.query.max_amount))) throw httpError(400, 'invalid_range');
  if (req.query.min_amount !== undefined && req.query.max_amount !== undefined && req.query.min_amount !== '' && req.query.max_amount !== '' && Number(req.query.min_amount) > Number(req.query.max_amount)) throw httpError(400, 'invalid_range');

  const values = [req.userId];
  const parts = [`t.user_id=$${startIndex}`];
  const bind = (value) => `$${startIndex + values.push(value) - 1}`;
  if (req.query.q) {
    const merchantParam = bind(req.query.q);
    const descriptionParam = bind(req.query.q);
    parts.push(`(t.merchant ILIKE '%' || ${merchantParam} || '%' OR COALESCE(t.description,'') ILIKE '%' || ${descriptionParam} || '%')`);
  }
  if (req.query.from) parts.push(`t.occurred_at >= ${bind(req.query.from)}::timestamptz`);
  if (req.query.to) parts.push(`t.occurred_at <= ${bind(req.query.to)}::timestamptz`);
  if (req.query.category_id) parts.push(`t.category_id = ${bind(req.query.category_id)}::uuid`);
  if (req.query.payment_method) parts.push(`t.payment_method = ${bind(req.query.payment_method)}`);
  if (req.query.min_amount !== undefined && req.query.min_amount !== '') parts.push(`t.amount >= ${bind(req.query.min_amount)}::numeric`);
  if (req.query.max_amount !== undefined && req.query.max_amount !== '') parts.push(`t.amount <= ${bind(req.query.max_amount)}::numeric`);
  if (req.query.is_splurge === 'true') parts.push('t.is_splurge=true');
  if (req.query.is_splurge === 'false') parts.push('t.is_splurge=false');
  return { where: parts.join(' AND '), values };
}

router.get('/export.csv', asyncRoute(async (req, res) => {
  const { where, values } = buildWhere(req);
  const { rows } = await pool.query(
    `${txSelect} WHERE ${where} ORDER BY t.occurred_at DESC`, values
  );
  const cols = ['occurred_at','merchant','amount','category_name','payment_method','description','source','is_splurge','external_reference'];
  const esc = (v) => {
    let value = String(v ?? '');
    if (/^\s*[=+@-]/.test(value)) value = `'${value}`;
    return `"${value.replace(/"/g, '""')}"`;
  };
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="gastador-transactions.csv"');
  res.send('\uFEFF' + csv);
}));

router.get('/', asyncRoute(async (req, res) => {
  const { where, values } = buildWhere(req);
  const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit || '30', 10) || 30));
  const offset = Math.max(0, Math.min(100000, Number.parseInt(req.query.offset || '0', 10) || 0));
  const sort = ({ date_desc: 't.occurred_at DESC', date_asc: 't.occurred_at ASC', amount_desc: 't.amount DESC,t.occurred_at DESC', amount_asc: 't.amount ASC,t.occurred_at DESC' })[req.query.sort] || 't.occurred_at DESC';
  const [data, count] = await Promise.all([
    pool.query(`${txSelect} WHERE ${where} ORDER BY ${sort} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, offset]),
    pool.query(`SELECT count(*)::int AS total FROM transactions t WHERE ${where}`, values)
  ]);
  res.json({ transactions: data.rows, total: count.rows[0].total });
}));

router.post('/', asyncRoute(async (req, res) => {
  const body = transactionSchema.parse(req.body);
  await assertSpendCategory(req.userId, body.category_id);
  if (body.external_reference) {
    const dupRef = await pool.query('SELECT id FROM transactions WHERE user_id=$1 AND payment_method=$2 AND external_reference=$3', [req.userId, body.payment_method, body.external_reference]);
    if (dupRef.rowCount) return res.status(409).json({ error: 'constraint_violation', constraint: 'transactions_external_reference_unique' });
  }
  if (!body.allow_duplicate) {
    const existing = await possibleDuplicate(req.userId, body);
    if (existing) return res.status(409).json({ error: 'possible_duplicate', existing });
  }
  const { rows } = await pool.query(
    `INSERT INTO transactions(user_id,amount,occurred_at,merchant,category_id,payment_method,description,source,ocr_status,external_reference,is_splurge)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id,amount,occurred_at,merchant,category_id,payment_method,description,source,ocr_status,external_reference,is_splurge,created_at,updated_at`,
    [req.userId,body.amount,body.occurred_at,body.merchant,body.category_id,body.payment_method,body.description ?? null,body.source ?? 'manual',body.ocr_status ?? (body.source && body.source !== 'manual' ? 'succeeded' : 'not_applicable'),body.external_reference ?? null,body.is_splurge ?? false]
  );
  const category = await pool.query('SELECT name FROM categories WHERE id=$1 AND user_id=$2', [body.category_id, req.userId]);
  res.status(201).json({ ...rows[0], category_name: category.rows[0].name });
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const { rows: tx } = await pool.query('SELECT id FROM transactions WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  if (!tx[0]) throw httpError(404, 'not_found');
  const { rows } = await pool.query('SELECT id,sha256,file_name,mime_type,size_bytes,created_at FROM transaction_receipts WHERE transaction_id=$1 AND user_id=$2 ORDER BY created_at', [req.params.id, req.userId]);
  res.json({ receipts: rows });
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const body = transactionSchema.partial().omit({ source: true, ocr_status: true, allow_duplicate: true }).parse(req.body);
  const fields = Object.entries(body);
  if (!fields.length) throw httpError(400, 'validation_failed');
  if (body.category_id) await assertSpendCategory(req.userId, body.category_id);
  const cols = { amount: 'amount', merchant: 'merchant', occurred_at: 'occurred_at', category_id: 'category_id', payment_method: 'payment_method', description: 'description', external_reference: 'external_reference', is_splurge: 'is_splurge' };
  const values = fields.map(([,v]) => v);
  const sets = fields.map(([k], i) => `${cols[k]}=$${i+1}`);
  sets.push('updated_at=now()');
  values.push(req.params.id, req.userId);
  const { rows } = await pool.query(
    `UPDATE transactions SET ${sets.join(',')} WHERE id=$${values.length-1} AND user_id=$${values.length}
     RETURNING id,amount,occurred_at,merchant,category_id,payment_method,description,source,ocr_status,external_reference,is_splurge,created_at,updated_at`, values
  );
  if (!rows[0]) throw httpError(404, 'not_found');
  const cat = await pool.query('SELECT name FROM categories WHERE id=$1 AND user_id=$2', [rows[0].category_id, req.userId]);
  res.json({ ...rows[0], category_name: cat.rows[0].name });
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const result = await pool.query('DELETE FROM transactions WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  if (!result.rowCount) throw httpError(404, 'not_found');
  res.status(204).end();
}));

router.post('/:id/receipts', asyncRoute(async (req, res) => {
  const body = z.object({ file_name: z.string().trim().min(1).max(180), mime_type: z.enum(['image/jpeg','image/png','image/webp']), size_bytes: z.number().int().positive().max(15000000), sha256: z.string().regex(/^[a-f0-9]{64}$/i) }).strict().parse(req.body);
  const { rows: own } = await pool.query('SELECT id FROM transactions WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  if (!own[0]) throw httpError(404, 'not_found');
  const { rows } = await pool.query(
    `INSERT INTO transaction_receipts(user_id,transaction_id,file_name,mime_type,size_bytes,sha256)
     VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(transaction_id,sha256) DO UPDATE SET file_name=EXCLUDED.file_name
     RETURNING id,sha256,file_name,mime_type,size_bytes,created_at`,
    [req.userId,req.params.id,body.file_name,body.mime_type,body.size_bytes,body.sha256.toLowerCase()]
  );
  res.status(201).json(rows[0]);
}));

export default router;
