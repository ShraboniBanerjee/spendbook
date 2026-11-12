import {
  getWorkspaceByKey, createPolicy, listPolicies, resolvePolicy, savePolicy,
} from './data.js';
import {
  cleanFields, applyTargeted, recordChange, checkExpense, findCategory, publicView,
} from './policy.js';
import { fmtMoney, num } from './util.js';

const BY_CLAUDE = 'Claude (via MCP)';
const SERVER_INFO = { name: 'spendbook', title: 'Spendbook', version: '1.0.0' };
const INSTRUCTIONS = [
  'Spendbook stores company expense policies and publishes them as a live employee handbook.',
  'You (Claude) draft the policy; Spendbook saves it, lets people edit it, and keeps the live link current.',
  'To create: draft the full policy, then call create_policy with spending limits in categories (one row per category per region), approval routing in approval_tiers, and all other rules in sections.',
  'To change an existing policy: call get_policy first, because people may have edited it in the Spendbook editor. Then call update_policy with only what changes (prefer upsert_categories and upsert_sections).',
  'Always give the user the editor link and the live handbook link that the tools return.',
].join(' ');

const categorySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Spend category, e.g. "Hotel", "Flights", "Team meals", "Client meals", "Local transport", "Software".' },
    region: { type: 'string', description: 'Country/region this limit applies to, e.g. "India", "Singapore". Use "All" if it applies everywhere.' },
    limit: { type: 'number', description: 'Maximum amount allowed. Omit for no cap.' },
    currency: { type: 'string', description: 'ISO currency of this limit if different from the policy base currency, e.g. SGD.' },
    unit: { type: 'string', description: 'How the limit applies: per claim, per day, per night, per trip, per person, per month, per year.' },
    receipt_required: { type: 'boolean', description: 'Whether a receipt is required. Default true.' },
    pre_approval: { type: 'boolean', description: 'Whether spend needs approval before it happens. Default false.' },
    notes: { type: 'string', description: 'Short rule for employees, e.g. "Economy class only for flights under 6 hours".' },
  },
  required: ['name'],
};

const tierSchema = {
  type: 'object',
  properties: {
    up_to: { type: 'number', description: 'Upper bound in the policy base currency. Omit for the top tier ("anything above").' },
    approver: { type: 'string', description: 'Role that approves, e.g. "Reporting manager", "Department head", "CFO".' },
    sla: { type: 'string', description: 'Expected turnaround, e.g. "within 2 working days".' },
  },
  required: ['approver'],
};

const sectionSchema = {
  type: 'object',
  properties: {
    heading: { type: 'string' },
    body: { type: 'string', description: 'Plain text. Start lines with "- " for bullet points. Use **bold** sparingly.' },
  },
  required: ['heading', 'body'],
};

const TOOLS = [
  {
    name: 'create_policy',
    title: 'Create expense policy',
    description: 'Save a new company expense policy to Spendbook after you have drafted it. Spendbook stores it, gives the team an editable version and publishes a live handbook link employees can check before they spend. Returns the editor link and the live link.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'e.g. "Travel & Meals Expense Policy"' },
        company_name: { type: 'string' },
        currency: { type: 'string', description: 'Base ISO currency code, e.g. INR, SGD, USD. Approval thresholds use this currency.' },
        regions: { type: 'array', items: { type: 'string' }, description: 'Countries/regions covered.' },
        effective_date: { type: 'string', description: 'YYYY-MM-DD' },
        summary: { type: 'string', description: 'Two or three plain-English sentences for employees.' },
        categories: { type: 'array', items: categorySchema, description: 'Spending limits, one row per category per region.' },
        approval_tiers: { type: 'array', items: tierSchema, description: 'Who approves claims at each amount, lowest first.' },
        sections: { type: 'array', items: sectionSchema, description: 'Everything else: purpose, who it covers, booking rules, receipts, reimbursement timeline, non-reimbursable items, corporate card use, violations.' },
      },
      required: ['title', 'company_name', 'currency', 'categories'],
    },
    annotations: { title: 'Create expense policy', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'list_policies',
    title: 'List expense policies',
    description: 'List the expense policies saved in this Spendbook workspace, with their links and version numbers.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { title: 'List expense policies', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_policy',
    title: 'Get expense policy',
    description: 'Read the current version of a policy, including edits people made in the Spendbook editor and its recent change history. Call this before update_policy.',
    inputSchema: {
      type: 'object',
      properties: { policy_id: { type: 'string', description: 'Policy id from list_policies or create_policy (a title also works).' } },
      required: ['policy_id'],
    },
    annotations: { title: 'Get expense policy', readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'update_policy',
    title: 'Update expense policy',
    description: 'Change an existing policy. Send only what changes. Prefer upsert_categories (matched by name + region) and upsert_sections (matched by heading) so edits people made in the editor are kept. Passing categories, approval_tiers or sections replaces that whole list. The live handbook updates immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        policy_id: { type: 'string' },
        change_note: { type: 'string', description: 'One line describing why it changed, shown in the change history.' },
        title: { type: 'string' },
        company_name: { type: 'string' },
        currency: { type: 'string' },
        regions: { type: 'array', items: { type: 'string' } },
        effective_date: { type: 'string' },
        summary: { type: 'string' },
        upsert_categories: { type: 'array', items: categorySchema, description: 'Add or update individual spending limits.' },
        remove_categories: {
          type: 'array',
          items: { type: 'object', properties: { name: { type: 'string' }, region: { type: 'string' } }, required: ['name'] },
        },
        upsert_sections: { type: 'array', items: sectionSchema, description: 'Add or replace individual sections by heading.' },
        categories: { type: 'array', items: categorySchema, description: 'Replaces ALL spending limits. Use only for a full rewrite.' },
        approval_tiers: { type: 'array', items: tierSchema, description: 'Replaces all approval tiers.' },
        sections: { type: 'array', items: sectionSchema, description: 'Replaces ALL sections. Use only for a full rewrite.' },
      },
      required: ['policy_id'],
    },
    annotations: { title: 'Update expense policy', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'check_expense',
    title: 'Check an expense against policy',
    description: 'Check whether a specific expense is within a saved policy, whether it needs a receipt or pre-approval, and who approves it. Spendbook applies the stored rules exactly; use this to answer employee questions such as "Can I expense a 7,000 INR hotel night in Bengaluru?".',
    inputSchema: {
      type: 'object',
      properties: {
        policy_id: { type: 'string' },
        category: { type: 'string', description: 'Category name as it appears in the policy, e.g. "Hotel".' },
        region: { type: 'string' },
        amount: { type: 'number' },
      },
      required: ['policy_id', 'category', 'amount'],
    },
    annotations: { title: 'Check an expense', readOnlyHint: true, openWorldHint: false },
  },
];

function links(p, base) {
  return { editor_url: `${base}/app/p/${p.id}`, live_url: `${base}/p/${p.slug}` };
}

function text(t) {
  return { content: [{ type: 'text', text: t }] };
}

function counts(p) {
  return `${p.categories.length} spending limits, ${p.approvals.length} approval tiers, ${p.sections.length} sections`;
}

async function callTool(name, args, ws, base) {
  args = args || {};
  if (name === 'create_policy') {
    const p = await createPolicy(ws, args, BY_CLAUDE);
    const l = links(p, base);
    return text(
      `Saved "${p.title}" for ${p.company || 'the company'} in Spendbook (version 1, ${counts(p)}).\n\n` +
      `Edit it: ${l.editor_url}\nLive handbook for employees: ${l.live_url}\n\npolicy_id: ${p.id}`,
    );
  }
  if (name === 'list_policies') {
    const all = await listPolicies(ws);
    if (!all.length) return text('No policies yet. Draft one and call create_policy to save it.');
    return text(all.map((p) => {
      const l = links(p, base);
      return `- ${p.title} (${p.company || 'no company'}) | policy_id: ${p.id} | version ${p.version} | updated ${p.updated_at}\n  Edit: ${l.editor_url}\n  Live: ${l.live_url}`;
    }).join('\n'));
  }
  if (name === 'get_policy') {
    const p = await resolvePolicy(ws, args.policy_id);
    if (!p) throw new Error('Policy not found in this workspace. Call list_policies to see available ids.');
    const { history, ...rest } = publicView(p);
    return text(JSON.stringify({ ...rest, ...links(p, base), recent_changes: (history || []).slice(0, 8) }, null, 2));
  }
  if (name === 'update_policy') {
    const p = await resolvePolicy(ws, args.policy_id);
    if (!p) throw new Error('Policy not found in this workspace. Call list_policies to see available ids.');
    let next = { ...p, ...cleanFields(args, p) };
    next = applyTargeted(next, args);
    const recorded = recordChange(p, next, BY_CLAUDE, args.change_note ? String(args.change_note).slice(0, 200) : '');
    if (!recorded) return text(`Nothing changed. "${p.title}" is still version ${p.version}.`);
    await savePolicy(recorded);
    const l = links(recorded, base);
    return text(
      `Updated "${recorded.title}" to version ${recorded.version}: ${recorded.history[0].summary}\n\n` +
      `Edit it: ${l.editor_url}\nLive handbook (already updated): ${l.live_url}`,
    );
  }
  if (name === 'check_expense') {
    const p = await resolvePolicy(ws, args.policy_id);
    if (!p) throw new Error('Policy not found in this workspace. Call list_policies to see available ids.');
    const amount = num(args.amount);
    if (amount === null) throw new Error('Give the amount as a number.');
    const cat = findCategory(p, args.category, args.region);
    if (!cat) {
      const names = [...new Set(p.categories.map((c) => `${c.name} (${c.region})`))].join(', ');
      throw new Error(`No category called "${args.category}" in this policy. Categories: ${names}`);
    }
    const r = checkExpense(p, cat, amount);
    const verdict = r.limit === null
      ? `No spending cap is set for ${r.category} (${r.region}).`
      : r.within_policy
        ? `Within policy. ${fmtMoney(amount, r.currency)} is within the ${fmtMoney(r.limit, r.currency)} ${r.unit} limit for ${r.category} (${r.region}).`
        : `Over policy by ${fmtMoney(r.over_by, r.currency)}. The limit for ${r.category} (${r.region}) is ${fmtMoney(r.limit, r.currency)} ${r.unit}; this needs an exception approval.`;
    const extra = [
      r.receipt_required ? 'Receipt required.' : 'No receipt needed.',
      r.pre_approval_required ? 'Needs approval before spending.' : '',
      r.approver ? `Approver: ${r.approver}${r.approver_turnaround ? ` (${r.approver_turnaround})` : ''}.` : '',
      r.note,
    ].filter(Boolean).join(' ');
    return text(`${verdict} ${extra}\n\nSource: "${p.title}" version ${p.version}, ${links(p, base).live_url}`);
  }
  throw Object.assign(new Error(`Unknown tool: ${name}`), { rpcCode: -32602 });
}

async function handleMessage(m, ws, base) {
  if (!m || typeof m !== 'object') return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid request' } };
  if (m.method === undefined) return null; // a response from the client; nothing to do
  if (m.id === undefined) return null; // notification (e.g. notifications/initialized)
  const ok = (result) => ({ jsonrpc: '2.0', id: m.id, result });
  const fail = (code, message) => ({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  const params = m.params || {};
  switch (m.method) {
    case 'initialize': {
      const requested = params.protocolVersion;
      const protocolVersion = typeof requested === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : '2025-06-18';
      return ok({ protocolVersion, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS });
    }
    case 'ping': return ok({});
    case 'tools/list': return ok({ tools: TOOLS });
    case 'tools/call': {
      try {
        return ok(await callTool(params.name, params.arguments, ws, base));
      } catch (e) {
        if (e.rpcCode) return fail(e.rpcCode, e.message);
        return ok({ content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true });
      }
    }
    case 'resources/list': return ok({ resources: [] });
    case 'resources/templates/list': return ok({ resourceTemplates: [] });
    case 'prompts/list': return ok({ prompts: [] });
    case 'logging/setLevel': return ok({});
    default: return fail(-32601, `Method not found: ${m.method}`);
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

export async function handleMcp(req, res, key, base, readJson) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') {
    // Stateless server: no server-initiated stream and no sessions to delete.
    res.statusCode = 405;
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.end();
  }
  const send = (status, obj) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };
  const ws = await getWorkspaceByKey(key);
  if (!ws) return send(404, { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unknown Spendbook connector URL. Copy it again from your Spendbook dashboard.' } });

  let body;
  try { body = await readJson(req); } catch { return send(400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  const batch = Array.isArray(body);
  const msgs = batch ? body : [body];
  const out = [];
  for (const m of msgs) {
    const r = await handleMessage(m, ws, base);
    if (r) out.push(r);
  }
  if (!out.length) { res.statusCode = 202; return res.end(); }
  return send(200, batch ? out : out[0]);
}
