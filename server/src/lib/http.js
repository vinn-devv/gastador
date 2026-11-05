export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return;
  console.error(err?.stack || err);
  if (err?.code === '23P01') return res.status(409).json({ error: 'constraint_violation', details: 'Budget cycle dates overlap.' });
  if (err?.code === '23505') return res.status(409).json({ error: 'constraint_violation', constraint: err.constraint });
  if (err?.code === '23503' || err?.code === '23514') return res.status(409).json({ error: 'constraint_violation', constraint: err.constraint });
  if (err?.name === 'ZodError') return res.status(400).json({ error: 'validation_failed', details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const message = status >= 500 ? 'server_error' : (err.message || 'request_failed');
  res.status(status).json({ error: message });
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
