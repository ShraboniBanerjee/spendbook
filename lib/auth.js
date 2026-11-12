import crypto from 'node:crypto';
import { sessionSecret } from './store.js';

export function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(pw), salt, 32).toString('hex');
  return { salt, hash };
}

export function verifyPassword(pw, salt, hash) {
  if (!salt || !hash) return false;
  const h = crypto.scryptSync(String(pw), salt, 32);
  const b = Buffer.from(hash, 'hex');
  return b.length === h.length && crypto.timingSafeEqual(h, b);
}

function hmac(data) {
  return crypto.createHmac('sha256', sessionSecret()).update(data).digest('base64url');
}

const COOKIE = 'sb_session';
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export function sessionCookie(email, secure) {
  const payload = Buffer.from(JSON.stringify({ e: email, x: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  const token = `${payload}.${hmac(payload)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure ? '; Secure' : ''}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readSession(req) {
  const raw = req.headers.cookie || '';
  const m = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  if (!m) return null;
  const token = m.slice(COOKIE.length + 1);
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = hmac(payload);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.e || data.x < Date.now()) return null;
    return data.e;
  } catch {
    return null;
  }
}
