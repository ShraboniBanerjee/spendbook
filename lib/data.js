import * as kv from './store.js';
import { rid, str } from './util.js';
import { hashPassword, verifyPassword } from './auth.js';
import { newPolicy } from './policy.js';

export const DEMO_EMAIL = (process.env.DEMO_EMAIL || 'demo@spendbook.app').toLowerCase();
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Volopay@2026';
const DEMO_KEY = process.env.DEMO_MCP_KEY || 'volopay-demo';

let demoReady = false;
export async function ensureDemo() {
  if (demoReady) return;
  const existing = await kv.get(`user:${DEMO_EMAIL}`);
  if (!existing) await createUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD, name: 'Demo', company: 'Demo Co', mcpKey: DEMO_KEY });
  demoReady = true;
}

export async function getUser(email) {
  return kv.get(`user:${String(email || '').toLowerCase().trim()}`);
}

export async function createUser({ email, password, name, company, mcpKey }) {
  email = String(email || '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid work email.');
  if (String(password || '').length < 8) throw new Error('Use a password with at least 8 characters.');
  if (await kv.get(`user:${email}`)) throw new Error('An account with this email already exists. Log in instead.');
  const wsId = rid(10);
  const key = mcpKey || rid(24);
  const ws = { id: wsId, name: str(company, 80) || 'My workspace', mcpKey: key, policyIds: [], created_at: new Date().toISOString() };
  const { salt, hash } = hashPassword(password);
  const user = { email, name: str(name, 80), salt, hash, workspaceId: wsId, created_at: ws.created_at };
  await kv.set(`ws:${wsId}`, ws);
  await kv.set(`key:${key}`, wsId);
  await kv.set(`user:${email}`, user);
  return user;
}

export async function login(email, password) {
  const user = await getUser(email);
  if (!user || !verifyPassword(password, user.salt, user.hash)) return null;
  return user;
}

export const getWorkspace = (id) => kv.get(`ws:${id}`);

export async function getWorkspaceByKey(key) {
  if (!key || !/^[a-z0-9-]{4,64}$/i.test(key)) return null;
  const id = await kv.get(`key:${key}`);
  return id ? getWorkspace(id) : null;
}

export async function listPolicies(ws) {
  const items = await Promise.all((ws.policyIds || []).map((id) => kv.get(`pol:${id}`)));
  return items.filter(Boolean).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
}

export const getPolicy = (id) => kv.get(`pol:${id}`);

export async function getPolicyBySlug(slug) {
  const id = await kv.get(`slug:${slug}`);
  return id ? getPolicy(id) : null;
}

export async function createPolicy(ws, input, by) {
  const p = newPolicy(input, { workspaceId: ws.id, by });
  await kv.set(`pol:${p.id}`, p);
  await kv.set(`slug:${p.slug}`, p.id);
  const fresh = (await getWorkspace(ws.id)) || ws;
  fresh.policyIds = [p.id, ...(fresh.policyIds || []).filter((x) => x !== p.id)];
  await kv.set(`ws:${ws.id}`, fresh);
  return p;
}

export async function savePolicy(p) {
  await kv.set(`pol:${p.id}`, p);
  return p;
}

export async function deletePolicy(ws, id) {
  const p = await getPolicy(id);
  if (!p || p.workspaceId !== ws.id) return false;
  await kv.del(`pol:${id}`);
  await kv.del(`slug:${p.slug}`);
  const fresh = (await getWorkspace(ws.id)) || ws;
  fresh.policyIds = (fresh.policyIds || []).filter((x) => x !== id);
  await kv.set(`ws:${ws.id}`, fresh);
  return true;
}

// Resolve a policy the workspace owns, by id or (as a convenience for Claude) by title.
export async function resolvePolicy(ws, ref) {
  if (!ref) return null;
  const byId = await getPolicy(ref);
  if (byId && byId.workspaceId === ws.id) return byId;
  const all = await listPolicies(ws);
  const r = String(ref).toLowerCase();
  return all.find((p) => p.title.toLowerCase() === r) || all.find((p) => p.title.toLowerCase().includes(r)) || null;
}
