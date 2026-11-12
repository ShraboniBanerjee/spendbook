import { storageMode } from '../lib/store.js';
import { sessionCookie, clearCookie, readSession } from '../lib/auth.js';
import {
  ensureDemo, getUser, createUser, login, getWorkspace, listPolicies, getPolicy, getPolicyBySlug,
  createPolicy, savePolicy, deletePolicy, DEMO_EMAIL, DEMO_PASSWORD,
} from '../lib/data.js';
import { cleanFields, recordChange, publicView } from '../lib/policy.js';
import { handleMcp } from '../lib/mcp.js';
import * as V from '../lib/views.js';

const SHOW_DEMO = process.env.SHOW_DEMO_LOGIN !== 'false';

function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0].trim();
  return `${proto}://${host}`;
}
const isHttps = (req) => baseUrl(req).startsWith('https://');

function send(res, status, body, type = 'text/html; charset=utf-8', headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(body);
}
const html = (res, body, status = 200) => send(res, status, body, 'text/html; charset=utf-8', { 'Cache-Control': 'no-store' });
const json = (res, obj, status = 200) => send(res, status, JSON.stringify(obj), 'application/json', { 'Cache-Control': 'no-store' });
function redirect(res, to, headers = {}) {
  res.statusCode = 303;
  res.setHeader('Location', to);
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end();
}

async function rawBody(req) {
  // Vercel may have parsed the body already.
  let pre;
  try { pre = req.body; } catch (e) { throw new Error('Invalid body'); }
  if (pre !== undefined && pre !== null) {
    if (Buffer.isBuffer(pre)) return pre.toString('utf8');
    return pre; // string or already-parsed object
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

async function readJson(req) {
  const b = await rawBody(req);
  if (typeof b === 'object') return b;
  return JSON.parse(b || 'null');
}

async function readForm(req) {
  const b = await rawBody(req);
  if (typeof b === 'object') return b;
  return Object.fromEntries(new URLSearchParams(b));
}

async function currentUser(req) {
  const email = readSession(req);
  if (!email) return null;
  const user = await getUser(email);
  if (!user) return null;
  const ws = await getWorkspace(user.workspaceId);
  return ws ? { user, ws } : null;
}

async function route(req, res) {
  const url = new URL(req.url, 'http://x');
  let path = url.pathname.replace(/\/+$/, '') || '/';
  const m = req.method;

  // MCP endpoint: /mcp/<key> (also /api/mcp/<key>)
  const mcp = path.match(/^(?:\/api)?\/mcp\/([A-Za-z0-9-]+)$/);
  if (mcp) { await ensureDemo(); return handleMcp(req, res, mcp[1], baseUrl(req), readJson); }

  if (path === '/health') return json(res, { ok: true, storage: storageMode });

  await ensureDemo();

  if (path === '/' && m === 'GET') return html(res, V.landing());

  if (path === '/login' || path === '/signup') {
    const mode = path.slice(1);
    const demo = SHOW_DEMO ? { email: DEMO_EMAIL, password: DEMO_PASSWORD } : null;
    if (m === 'GET') {
      if (await currentUser(req)) return redirect(res, '/app');
      return html(res, V.authPage(mode, { demo }));
    }
    if (m === 'POST') {
      const f = await readForm(req);
      if (mode === 'login') {
        const user = await login(f.email, f.password);
        if (!user) return html(res, V.authPage('login', { error: 'That email and password do not match an account.', values: f, demo }), 401);
        return redirect(res, '/app', { 'Set-Cookie': sessionCookie(user.email, isHttps(req)) });
      }
      try {
        const user = await createUser({ email: f.email, password: f.password, name: f.name, company: f.company });
        return redirect(res, '/app', { 'Set-Cookie': sessionCookie(user.email, isHttps(req)) });
      } catch (e) {
        return html(res, V.authPage('signup', { error: e.message, values: f }), 400);
      }
    }
  }

  if (path === '/logout') return redirect(res, '/', { 'Set-Cookie': clearCookie() });

  // Public live handbook
  const pub = path.match(/^\/p\/([a-z0-9-]+)$/);
  if (pub && m === 'GET') {
    const p = await getPolicyBySlug(pub[1]);
    if (!p) return html(res, V.notFound('This policy link is not live. It may have been deleted.'), 404);
    return html(res, V.handbook(p));
  }
  const live = path.match(/^\/api\/live\/([a-z0-9-]+)$/);
  if (live && m === 'GET') {
    const p = await getPolicyBySlug(live[1]);
    return p ? json(res, { version: p.version, updated_at: p.updated_at }) : json(res, { error: 'Not found' }, 404);
  }

  // Everything below needs a logged-in user
  const isApi = path.startsWith('/api/');
  const isApp = path === '/app' || path.startsWith('/app/');
  if (!isApi && !isApp) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  const me = await currentUser(req);
  if (!me) return isApi ? json(res, { error: 'Log in again to continue.' }, 401) : redirect(res, '/login');
  const { user, ws } = me;

  if (path === '/app' && m === 'GET') {
    const policies = await listPolicies(ws);
    return html(res, V.dashboard({ user, ws, policies, base: baseUrl(req), storageMode }));
  }
  if (path === '/app/new' && m === 'POST') {
    const p = await createPolicy(ws, {
      title: 'Expense policy', company_name: ws.name, currency: 'INR', categories: [], approval_tiers: [], sections: [],
    }, user.name || user.email);
    return redirect(res, `/app/p/${p.id}`);
  }
  const ed = path.match(/^\/app\/p\/([a-z0-9]+)$/);
  if (ed && m === 'GET') {
    const p = await getPolicy(ed[1]);
    if (!p || p.workspaceId !== ws.id) return html(res, V.notFound('This policy is not in your workspace.'), 404);
    return html(res, V.editor({ user, ws, policy: p }));
  }

  if (path === '/api/policies' && m === 'GET') {
    const all = await listPolicies(ws);
    return json(res, {
      signature: all.map((p) => p.id + ':' + p.version).join(','),
      policies: all.map((p) => ({ id: p.id, title: p.title, version: p.version, updated_at: p.updated_at })),
    });
  }
  const api = path.match(/^\/api\/policies\/([a-z0-9]+)$/);
  if (api) {
    const p = await getPolicy(api[1]);
    if (!p || p.workspaceId !== ws.id) return json(res, { error: 'Policy not found.' }, 404);
    if (m === 'GET') return json(res, { policy: publicView(p) });
    if (m === 'PUT') {
      let body;
      try { body = await readJson(req); } catch { return json(res, { error: 'Could not read the changes. Try again.' }, 400); }
      const next = { ...p, ...cleanFields(body || {}, p) };
      const recorded = recordChange(p, next, user.name || user.email, '');
      if (!recorded) return json(res, { policy: publicView(p), changed: false });
      await savePolicy(recorded);
      return json(res, { policy: publicView(recorded), changed: true });
    }
    if (m === 'DELETE') {
      await deletePolicy(ws, p.id);
      return json(res, { ok: true });
    }
  }
  return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
}

export default async function handler(req, res) {
  try {
    await route(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, 500, `Something went wrong: ${e.message}`, 'text/plain; charset=utf-8');
    else res.end();
  }
}
