import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db/pool.js';
import { asyncRoute, httpError } from './lib/http.js';

const scrypt = promisify(crypto.scrypt);
const COOKIE = 'gastador_session';
const sessionDays = Math.max(1, Math.min(90, Number(process.env.SESSION_DAYS || 30)));

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [kind, salt, expected] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !expected) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64)).toString('hex');
  const a = Buffer.from(actual, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function cookieValue(req) {
  const raw = req.headers.cookie || '';
  const pair = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
  if (!pair) return '';
  try { return decodeURIComponent(pair.slice(COOKIE.length + 1)); } catch { return ''; }
}

export function setSessionCookie(res, token, expiresAt) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}

export function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

export async function createSession(userId, res) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + sessionDays * 86400000);
  await pool.query('INSERT INTO sessions(user_id, token_hash, expires_at) VALUES ($1,$2,$3)', [userId, tokenHash, expiresAt]);
  setSessionCookie(res, token, expiresAt);
}

export const requireAuth = asyncRoute(async (req, _res, next) => {
  const token = cookieValue(req);
  if (!token) throw httpError(401, 'unauthenticated');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const { rows } = await pool.query(
    'SELECT s.user_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > now()',
    [tokenHash]
  );
  if (!rows[0]) throw httpError(401, 'unauthenticated');
  req.userId = rows[0].user_id;
  req.sessionTokenHash = tokenHash;
  next();
});

export async function revokeSession(req) {
  if (req.sessionTokenHash) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [req.sessionTokenHash]);
}
