import crypto from 'node:crypto';

// Finds Upstash Redis REST credentials whatever name Vercel or Upstash gave them.
function findCreds() {
  const env = process.env;
  const pairs = [
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
  ];
  for (const [u, t] of pairs) if (env[u] && env[t]) return { url: env[u], token: env[t] };
  for (const k of Object.keys(env)) {
    if (/KV_REST_API_URL$/.test(k)) {
      const t = k.replace(/URL$/, 'TOKEN');
      if (env[t]) return { url: env[k], token: env[t] };
    }
    if (/REDIS_REST_URL$/.test(k)) {
      const t = k.replace(/URL$/, 'TOKEN');
      if (env[t]) return { url: env[k], token: env[t] };
    }
  }
  return null;
}

const creds = findCreds();
export const storageMode = creds ? 'upstash' : 'memory';

const mem = globalThis.__SPENDBOOK_MEM || (globalThis.__SPENDBOOK_MEM = new Map());

async function cmd(args) {
  const r = await fetch(creds.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (j.error) throw new Error(`Storage error: ${j.error}`);
  return j.result;
}

export async function get(key) {
  if (!creds) return mem.has(key) ? JSON.parse(mem.get(key)) : null;
  const v = await cmd(['GET', key]);
  return v === null || v === undefined ? null : JSON.parse(v);
}

export async function set(key, value) {
  const s = JSON.stringify(value);
  if (!creds) { mem.set(key, s); return; }
  await cmd(['SET', key, s]);
}

export async function del(key) {
  if (!creds) { mem.delete(key); return; }
  await cmd(['DEL', key]);
}

export function sessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  return crypto.createHash('sha256').update('spendbook:' + (creds ? creds.token : 'local-dev')).digest('hex');
}
