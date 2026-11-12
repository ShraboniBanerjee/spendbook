import { rid, str, num, fmtMoney } from './util.js';

export const UNITS = ['per claim', 'per day', 'per night', 'per trip', 'per person', 'per month', 'per year'];

function cur(v) {
  const c = str(v, 3).toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : '';
}

function bool(v, dflt) {
  if (v === undefined || v === null || v === '') return dflt;
  if (typeof v === 'string') return !['false', 'no', '0', 'off'].includes(v.toLowerCase());
  return !!v;
}

export function normCategory(c = {}, policyCurrency = '') {
  const currency = cur(c.currency);
  return {
    id: str(c.id, 20) || rid(8),
    name: str(c.name, 80) || 'Untitled category',
    region: str(c.region, 40) || 'All',
    limit: num(c.limit),
    currency: currency && currency !== policyCurrency ? currency : '',
    unit: str(c.unit, 30) || 'per claim',
    receipt_required: bool(c.receipt_required, true),
    pre_approval: bool(c.pre_approval, false),
    notes: str(c.notes, 500),
  };
}

export function normTier(t = {}) {
  return {
    id: str(t.id, 20) || rid(8),
    up_to: num(t.up_to),
    approver: str(t.approver, 80) || 'Finance',
    sla: str(t.sla, 60),
  };
}

export function sortTiers(tiers) {
  return [...tiers].sort((a, b) => {
    if (a.up_to === null && b.up_to === null) return 0;
    if (a.up_to === null) return 1;
    if (b.up_to === null) return -1;
    return a.up_to - b.up_to;
  });
}

export function normSection(s = {}) {
  return {
    id: str(s.id, 20) || rid(8),
    heading: str(s.heading, 120) || 'Untitled section',
    body: str(s.body, 8000),
  };
}

function regionsOf(v) {
  if (Array.isArray(v)) return v.map((r) => str(r, 40)).filter(Boolean).slice(0, 20);
  if (typeof v === 'string') return v.split(',').map((r) => str(r, 40)).filter(Boolean).slice(0, 20);
  return [];
}

// Builds the editable fields of a policy from loose input (Claude or the editor).
export function cleanFields(input = {}, base = {}) {
  const out = { ...base };
  if (input.title !== undefined) out.title = str(input.title, 140) || 'Expense policy';
  const company = input.company_name ?? input.company;
  if (company !== undefined) out.company = str(company, 120);
  if (input.currency !== undefined) out.currency = cur(input.currency) || out.currency || 'INR';
  if (input.regions !== undefined) out.regions = regionsOf(input.regions);
  if (input.effective_date !== undefined) out.effective_date = str(input.effective_date, 20);
  if (input.summary !== undefined) out.summary = str(input.summary, 2000);
  const pc = out.currency || 'INR';
  if (input.categories !== undefined) out.categories = (input.categories || []).slice(0, 200).map((c) => normCategory(c, pc));
  const tiers = input.approval_tiers ?? input.approvals;
  if (tiers !== undefined) out.approvals = sortTiers((tiers || []).slice(0, 20).map(normTier));
  if (input.sections !== undefined) out.sections = (input.sections || []).slice(0, 60).map(normSection);
  return out;
}

export function newPolicy(input, { workspaceId, by }) {
  const now = new Date().toISOString();
  const fields = cleanFields(input, {
    title: 'Expense policy', company: '', currency: 'INR', regions: [], effective_date: '',
    summary: '', categories: [], approvals: [], sections: [],
  });
  const id = rid(10);
  return {
    id,
    workspaceId,
    slug: `${slugOf(fields)}-${rid(4)}`,
    ...fields,
    version: 1,
    created_at: now,
    updated_at: now,
    created_by: by,
    history: [{ at: now, by, summary: 'Created' }],
  };
}

function slugOf(f) {
  const base = `${f.company || ''} ${f.title || ''}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base.slice(0, 48) || 'policy';
}

const key = (c) => `${(c.name || '').toLowerCase().trim()}|${(c.region || 'All').toLowerCase().trim()}`;

// Partial, targeted edits from Claude (so human edits in the editor are not overwritten).
export function applyTargeted(policy, input) {
  const p = { ...policy, categories: [...policy.categories], sections: [...policy.sections] };
  const pc = p.currency;
  for (const u of input.upsert_categories || []) {
    const k = key({ name: u.name, region: u.region || 'All' });
    const i = p.categories.findIndex((c) => key(c) === k);
    if (i >= 0) {
      const merged = { ...p.categories[i] };
      for (const f of ['limit', 'currency', 'unit', 'receipt_required', 'pre_approval', 'notes']) {
        if (u[f] !== undefined) merged[f] = u[f];
      }
      p.categories[i] = normCategory(merged, pc);
    } else {
      p.categories.push(normCategory(u, pc));
    }
  }
  for (const r of input.remove_categories || []) {
    const k = key({ name: r.name, region: r.region || 'All' });
    p.categories = p.categories.filter((c) => key(c) !== k);
  }
  for (const s of input.upsert_sections || []) {
    const i = p.sections.findIndex((x) => x.heading.toLowerCase().trim() === String(s.heading || '').toLowerCase().trim());
    if (i >= 0) p.sections[i] = normSection({ ...p.sections[i], body: s.body ?? p.sections[i].body });
    else p.sections.push(normSection(s));
  }
  return p;
}

function limitText(c, pc) {
  return c.limit === null ? 'no cap' : `${fmtMoney(c.limit, c.currency || pc)} ${c.unit}`;
}

export function describeChanges(a, b) {
  const out = [];
  const labels = { title: 'Title', company: 'Company', currency: 'Base currency', effective_date: 'Effective date' };
  for (const f of Object.keys(labels)) {
    if ((a[f] || '') !== (b[f] || '')) out.push(`${labels[f]}: ${a[f] || 'blank'} to ${b[f] || 'blank'}`);
  }
  if ((a.summary || '') !== (b.summary || '')) out.push('Summary edited');
  if ((a.regions || []).join('|') !== (b.regions || []).join('|')) out.push(`Regions: ${(b.regions || []).join(', ') || 'none'}`);

  const am = new Map(a.categories.map((c) => [key(c), c]));
  const bm = new Map(b.categories.map((c) => [key(c), c]));
  for (const [k, c] of bm) {
    const o = am.get(k);
    if (!o) out.push(`Added ${c.name} (${c.region}): ${limitText(c, b.currency)}`);
    else if (o.limit !== c.limit || o.unit !== c.unit || (o.currency || a.currency) !== (c.currency || b.currency)) {
      out.push(`${c.name} (${c.region}): ${limitText(o, a.currency)} to ${limitText(c, b.currency)}`);
    } else if (o.receipt_required !== c.receipt_required || o.pre_approval !== c.pre_approval || o.notes !== c.notes) {
      out.push(`${c.name} (${c.region}) rules updated`);
    }
  }
  for (const [k, c] of am) if (!bm.has(k)) out.push(`Removed ${c.name} (${c.region})`);

  const tierSig = (t) => JSON.stringify(t.map((x) => [x.up_to, x.approver, x.sla]));
  if (tierSig(a.approvals) !== tierSig(b.approvals)) out.push('Approval tiers updated');

  const as = new Map(a.sections.map((s) => [s.heading.toLowerCase(), s]));
  const bs = new Map(b.sections.map((s) => [s.heading.toLowerCase(), s]));
  for (const [k, s] of bs) {
    const o = as.get(k);
    if (!o) out.push(`Added section "${s.heading}"`);
    else if (o.body !== s.body) out.push(`Edited section "${s.heading}"`);
  }
  for (const [k, s] of as) if (!bs.has(k)) out.push(`Removed section "${s.heading}"`);
  return out;
}

export function summarise(changes) {
  if (!changes.length) return '';
  const shown = changes.slice(0, 5).join('; ');
  return changes.length > 5 ? `${shown}; and ${changes.length - 5} more` : shown;
}

export function recordChange(oldP, newP, by, note) {
  const changes = describeChanges(oldP, newP);
  if (!changes.length && !note) return null;
  const now = new Date().toISOString();
  const entry = { at: now, by, summary: note ? (changes.length ? `${note}. ${summarise(changes)}` : note) : summarise(changes) };
  return {
    ...newP,
    version: (oldP.version || 1) + 1,
    updated_at: now,
    history: [entry, ...(oldP.history || [])].slice(0, 60),
  };
}

// Deterministic rule check: no AI, just the stored policy.
export function checkExpense(policy, cat, amount) {
  const currency = cat.currency || policy.currency;
  const within = cat.limit === null || amount <= cat.limit;
  let approver = null;
  let approverNote = '';
  if (currency === policy.currency && policy.approvals.length) {
    const tier = sortTiers(policy.approvals).find((t) => t.up_to === null || amount <= t.up_to);
    if (tier) approver = tier;
    else {
      const last = sortTiers(policy.approvals).at(-1);
      approver = last;
      approverNote = 'Amount is above every approval tier';
    }
  } else if (policy.approvals.length) {
    approverNote = `Approval tiers are set in ${policy.currency}. Ask finance who approves ${currency} claims.`;
  }
  return {
    category: cat.name,
    region: cat.region,
    amount,
    currency,
    limit: cat.limit,
    unit: cat.unit,
    within_policy: within,
    over_by: within ? 0 : +(amount - cat.limit).toFixed(2),
    receipt_required: cat.receipt_required,
    pre_approval_required: cat.pre_approval,
    approver: approver ? approver.approver : null,
    approver_turnaround: approver ? approver.sla : null,
    note: [cat.notes, approverNote].filter(Boolean).join(' '),
  };
}

export function findCategory(policy, name, region) {
  const n = String(name || '').toLowerCase().trim();
  const r = String(region || '').toLowerCase().trim();
  let list = policy.categories;
  if (r) {
    const byRegion = list.filter((c) => c.region.toLowerCase() === r || c.region.toLowerCase() === 'all');
    if (byRegion.length) list = byRegion;
  }
  return (
    list.find((c) => c.name.toLowerCase() === n && (!r || c.region.toLowerCase() === r)) ||
    list.find((c) => c.name.toLowerCase() === n) ||
    list.find((c) => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase())) ||
    null
  );
}

export function publicView(p) {
  const { workspaceId, ...rest } = p;
  return rest;
}
