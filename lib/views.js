import { esc, fmtMoney, fmtDate, fmtDateTime, jsonForScript } from './util.js';
import { UNITS, sortTiers } from './policy.js';

const FONTS = 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap';

const CSS = `
:root{
  --paper:#F1F3F2; --surface:#FFFFFF; --ink:#15202B; --muted:#58656F; --rule:#D3DADD; --rule-soft:#E4E9EB;
  --carbon:#2D3A9C; --carbon-deep:#1F2977; --carbon-tint:#E6E9F7;
  --ok:#17744A; --ok-bg:#E2F2E8; --warn:#93570A; --warn-bg:#FBEFD8; --bad:#B0281B; --bad-bg:#FBE5E2;
  --ui:'Schibsted Grotesk',system-ui,-apple-system,'Segoe UI',sans-serif;
  --read:'Newsreader',Georgia,'Times New Roman',serif;
  color-scheme:light;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:400 16px/1.5 var(--ui);font-variant-numeric:tabular-nums}
a{color:var(--carbon)}
a:hover{color:var(--carbon-deep)}
:focus-visible{outline:3px solid var(--carbon);outline-offset:2px;border-radius:4px}
h1,h2,h3{font-family:var(--ui);line-height:1.15;margin:0;letter-spacing:-.01em}
h1{font-size:clamp(28px,4vw,40px);font-weight:800}
h2{font-size:20px;font-weight:700}
h3{font-size:16px;font-weight:700}
p{margin:0}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:600 15px/1 var(--ui);padding:11px 16px;border-radius:8px;border:1.5px solid var(--ink);background:var(--surface);color:var(--ink);text-decoration:none;cursor:pointer;white-space:nowrap}
.btn:hover{background:var(--carbon-tint);color:var(--ink)}
.btn.primary{background:var(--carbon);border-color:var(--carbon);color:#fff}
.btn.primary:hover{background:var(--carbon-deep);border-color:var(--carbon-deep);color:#fff}
.btn.small{padding:7px 11px;font-size:14px;border-width:1px}
.btn.quiet{border-color:var(--rule);background:transparent}
.btn.danger{border-color:var(--bad);color:var(--bad)}
.btn.danger:hover{background:var(--bad-bg)}
.btn:disabled{opacity:.5;cursor:default}
.logo{display:inline-flex;align-items:center;gap:10px;font:800 19px/1 var(--ui);color:var(--ink);text-decoration:none;letter-spacing:-.02em}
.logo-mark{width:26px;height:30px;border:2px solid var(--ink);border-radius:3px 3px 3px 3px;position:relative;background:var(--surface)}
.logo-mark::before,.logo-mark::after{content:"";position:absolute;left:4px;right:4px;height:2px;background:var(--ink)}
.logo-mark::before{top:7px}.logo-mark::after{top:13px;right:9px}
.logo-mark i{position:absolute;right:-7px;bottom:-6px;width:14px;height:14px;border-radius:50%;background:var(--ok);border:2px solid var(--paper)}
.appbar{background:var(--surface);border-bottom:1px solid var(--rule)}
.appbar .wrap{display:flex;align-items:center;justify-content:space-between;height:60px;gap:12px}
.appbar .who{display:flex;align-items:center;gap:14px;color:var(--muted);font-size:14px}
.appbar form{margin:0}
.linkbtn{background:none;border:0;font:500 14px var(--ui);color:var(--carbon);cursor:pointer;padding:4px;text-decoration:underline}
input,select,textarea{font:400 15px/1.4 var(--ui);color:var(--ink);background:var(--surface);border:1px solid var(--rule);border-radius:6px;padding:9px 10px;width:100%}
input:focus,select:focus,textarea:focus{border-color:var(--carbon);outline:2px solid var(--carbon-tint);outline-offset:0}
textarea{resize:vertical;min-height:120px;line-height:1.55}
label{display:block;font-weight:600;font-size:14px;margin-bottom:6px}
.field{margin-bottom:14px}
.hint{color:var(--muted);font-size:14px}
.error{background:var(--bad-bg);color:var(--bad);border-radius:8px;padding:10px 12px;font-size:14px;margin-bottom:14px}
.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{border-collapse:collapse;width:100%}
th{font-weight:600;font-size:13px;color:var(--muted);text-align:left;padding:8px 8px;border-bottom:1.5px solid var(--ink);white-space:nowrap}
td{padding:8px;border-bottom:1px solid var(--rule-soft);vertical-align:top}
.num{text-align:right}
.stamp{display:inline-block;font:800 15px/1.1 var(--ui);letter-spacing:.01em;padding:7px 12px;border:2.5px solid currentColor;border-radius:5px;transform:rotate(-2.5deg);background:transparent}
.stamp.ok{color:var(--ok)}.stamp.warn{color:var(--warn)}.stamp.bad{color:var(--bad)}
.chip{display:inline-block;font-size:13px;font-weight:600;padding:3px 9px;border-radius:999px;background:var(--carbon-tint);color:var(--carbon-deep)}
.badge-claude{display:inline-block;font-size:12px;font-weight:600;padding:2px 8px;border-radius:4px;background:var(--ok-bg);color:var(--ok)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}

/* Landing */
.l-nav{display:flex;align-items:center;justify-content:space-between;height:72px}
.l-nav nav{display:flex;gap:10px;align-items:center}
.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center;padding-top:48px;padding-bottom:72px}
.hero h1{font-size:clamp(34px,5.2vw,58px);line-height:1.02;letter-spacing:-.03em;max-width:13ch}
.hero .lede{font-size:19px;color:var(--muted);margin:22px 0 28px;max-width:46ch}
.hero .ctas{display:flex;gap:12px;flex-wrap:wrap}
.slip{background:var(--surface);border:1.5px solid var(--ink);border-radius:4px;padding:22px;position:relative;box-shadow:8px 8px 0 var(--carbon-tint)}
.slip .ask{background:var(--paper);border-radius:10px 10px 10px 2px;padding:12px 14px;font-size:15px;margin-bottom:18px;max-width:92%}
.slip .ask small{display:block;color:var(--muted);font-size:12px;margin-bottom:4px;font-weight:600}
.slip table td,.slip table th{font-size:14px;padding:7px 6px}
.slip .verdict{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;padding-top:16px;border-top:1.5px dashed var(--rule)}
.slip .verdict p{font-size:14px;color:var(--muted);max-width:28ch}
.how{border-top:1.5px solid var(--ink);padding:44px 0}
.how ol{list-style:none;padding:0;margin:26px 0 0;display:grid;grid-template-columns:repeat(3,1fr);gap:28px;counter-reset:s}
.how li{counter-increment:s;padding-top:14px;border-top:1px solid var(--rule)}
.how li::before{content:counter(s);display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--ink);color:#fff;font-weight:700;font-size:14px;margin-bottom:12px}
.how li p{color:var(--muted);margin-top:6px}
.noai{background:var(--ink);color:#fff;border-radius:6px;padding:28px;display:grid;grid-template-columns:1fr 1.2fr;gap:28px;margin:8px 0 56px}
.noai p{color:#C9D2DA}
.pricing{padding:0 0 64px}
.plans{display:grid;grid-template-columns:repeat(3,1fr);border:1.5px solid var(--ink);border-radius:6px;background:var(--surface);margin-top:22px}
.plan{padding:24px;border-right:1px solid var(--rule)}
.plan:last-child{border-right:0}
.plan.mid{background:var(--carbon-tint)}
.plan .price{font-size:32px;font-weight:800;margin:10px 0 2px;letter-spacing:-.02em}
.plan .price small{font-size:15px;font-weight:500;color:var(--muted)}
.plan ul{padding-left:18px;margin:14px 0 0;color:var(--muted);font-size:15px}
.plan li{margin-bottom:6px}
.l-foot{border-top:1px solid var(--rule);padding:22px 0 40px;color:var(--muted);font-size:14px}

/* Auth */
.auth{max-width:420px;margin:48px auto;padding:0 20px}
.auth .card{background:var(--surface);border:1px solid var(--rule);border-radius:10px;padding:26px;margin-top:20px}
.auth h1{font-size:28px}
.auth .alt{margin-top:16px;font-size:14px;color:var(--muted)}
.demo-hint{background:var(--carbon-tint);border-radius:8px;padding:12px 14px;font-size:14px;margin-top:16px}

/* Dashboard */
.dash{display:grid;grid-template-columns:1fr 380px;gap:32px;padding-top:32px;padding-bottom:64px;align-items:start}
.dash-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap}
.pol-list{list-style:none;margin:0;padding:0;border-top:1.5px solid var(--ink)}
.pol{display:flex;justify-content:space-between;gap:16px;padding:18px 2px;border-bottom:1px solid var(--rule)}
.pol h3 a{color:var(--ink);text-decoration:none}
.pol h3 a:hover{text-decoration:underline}
.pol .meta{color:var(--muted);font-size:14px;margin-top:4px;display:flex;flex-wrap:wrap;gap:4px 14px}
.pol .acts{display:flex;gap:8px;align-items:flex-start;flex-shrink:0}
.empty{background:var(--surface);border:1.5px dashed var(--rule);border-radius:10px;padding:28px;text-align:left}
.empty p{color:var(--muted);margin:8px 0 16px;max-width:52ch}
.connect{background:var(--surface);border:1.5px solid var(--ink);border-radius:6px;padding:22px;position:sticky;top:20px}
.connect ol{padding-left:20px;margin:14px 0 0}
.connect li{margin-bottom:14px;font-size:15px}
.copyrow{display:flex;gap:8px;margin-top:8px}
.copyrow input{font-size:13px;background:var(--paper)}
.prompts{list-style:none;padding:0;margin:10px 0 0}
.prompts li{background:var(--paper);border-radius:8px;padding:10px 12px;font-size:14px;margin-bottom:8px;display:flex;gap:10px;justify-content:space-between;align-items:flex-start}
.store{font-size:13px;color:var(--muted);margin-top:16px;padding-top:12px;border-top:1px solid var(--rule)}
.store.warn{color:var(--warn)}

/* Editor */
.ed-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:22px 0 10px;flex-wrap:wrap;position:sticky;top:0;background:var(--paper);z-index:5}
.ed-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.save-status{font-size:14px;color:var(--muted)}
.save-status.dirty{color:var(--warn);font-weight:600}
.ed-title{padding:6px 0 18px}
.ed-title .meta{color:var(--muted);font-size:14px;margin-top:6px}
.panel{background:var(--surface);border:1px solid var(--rule);border-radius:10px;padding:22px;margin-bottom:20px}
.panel-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:6px;flex-wrap:wrap}
.panel .hint{margin-bottom:14px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}
.grid4{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:0 18px}
.ed-table input{padding:7px 8px;font-size:14px;min-width:70px}
.ed-table td{padding:6px 4px;border-bottom:1px solid var(--rule-soft)}
.ed-table th{padding:6px 4px}
.ed-table input[type=checkbox]{width:18px;height:18px;min-width:0;accent-color:var(--carbon)}
.ed-table .c{text-align:center}
.rm{background:none;border:0;color:var(--muted);cursor:pointer;font:600 20px/1 var(--ui);padding:6px 8px;border-radius:6px}
.rm:hover{background:var(--bad-bg);color:var(--bad)}
.sec{border-top:1px solid var(--rule-soft);padding:16px 0}
.sec:first-of-type{border-top:0;padding-top:4px}
.sec-head{display:flex;gap:8px;align-items:center;margin-bottom:8px}
.sec-head input{font-weight:700}
.hist{list-style:none;padding:0;margin:0}
.hist li{padding:10px 0;border-bottom:1px solid var(--rule-soft);font-size:14px}
.hist .when{color:var(--muted)}
.hist .by{font-weight:600}
.banner{background:var(--carbon-tint);border-radius:8px;padding:10px 14px;font-size:14px;margin:0 0 16px;display:none;gap:12px;align-items:center;justify-content:space-between}
.banner.show{display:flex}
.danger-zone{padding:8px 0 60px}

/* Handbook */
.hb-head{background:var(--surface);border-bottom:1.5px solid var(--ink)}
.hb-head .wrap{padding-top:34px;padding-bottom:28px}
.hb-company{font-weight:700;color:var(--carbon);font-size:15px}
.hb-head h1{margin-top:8px;font-size:clamp(30px,4.6vw,46px);letter-spacing:-.025em;max-width:22ch}
.hb-meta{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:14px;color:var(--muted);font-size:14px;align-items:center}
.hb{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:40px;padding-top:34px;padding-bottom:72px;align-items:start}
.hb-doc{min-width:0}
.hb-summary{font-family:var(--read);font-size:21px;line-height:1.55;max-width:62ch;margin-bottom:34px}
.hb-doc section{margin-bottom:38px}
.hb-doc h2{font-size:22px;margin-bottom:14px}
.hb-doc .prose{font-family:var(--read);font-size:18px;line-height:1.65;max-width:66ch}
.prose p{margin:0 0 12px}.prose ul,.prose ol{margin:0 0 12px;padding-left:22px}.prose li{margin-bottom:6px}
.limits td{font-size:15px}
.limits .region-row td{background:var(--paper);font-weight:700;font-size:14px;padding-top:14px;border-bottom:1px solid var(--rule)}
.limits .amt{font-weight:700;white-space:nowrap}
.limits .unit{color:var(--muted);font-weight:400;font-size:13px}
.limits .rule{color:var(--muted);font-size:14px}
.tiers{list-style:none;padding:0;margin:0;border-top:1.5px solid var(--ink)}
.tiers li{display:grid;grid-template-columns:200px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid var(--rule-soft)}
.tiers .band{font-weight:700}
.tiers .sla{color:var(--muted);font-size:14px}
.checker{background:var(--surface);border:1.5px solid var(--ink);border-radius:6px;padding:22px;position:sticky;top:20px}
.checker h2{font-size:20px}
.checker .hint{margin:6px 0 16px}
.amount{display:flex;align-items:stretch}
.amount span{display:grid;place-items:center;padding:0 12px;background:var(--paper);border:1px solid var(--rule);border-right:0;border-radius:6px 0 0 6px;font-weight:600;font-size:14px}
.amount input{border-radius:0 6px 6px 0}
.result{margin-top:18px;min-height:90px;border-top:1.5px dashed var(--rule);padding-top:16px}
.result ul{padding-left:18px;margin:12px 0 0;font-size:14px;color:var(--ink)}
.result li{margin-bottom:5px}
.result .idle{color:var(--muted);font-size:14px}
.hb-foot{border-top:1px solid var(--rule);padding:20px 0 40px;color:var(--muted);font-size:14px}
.toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:var(--ink);color:#fff;padding:12px 16px;border-radius:8px;font-size:14px;display:none;gap:12px;align-items:center;z-index:20}
.toast.show{display:flex}
.toast button{background:#fff;color:var(--ink);border:0;border-radius:6px;padding:6px 10px;font:600 13px var(--ui);cursor:pointer}

@media (max-width:900px){
  .hero{grid-template-columns:1fr;gap:36px;padding-top:24px}
  .how ol,.plans{grid-template-columns:1fr}
  .plan{border-right:0;border-bottom:1px solid var(--rule)}
  .plan:last-child{border-bottom:0}
  .noai{grid-template-columns:1fr}
  .dash{grid-template-columns:1fr}
  .connect{position:static;order:-1}
  .hb{grid-template-columns:1fr}
  .checker{position:static}
  .hb-aside{order:-1}
  .grid2,.grid4{grid-template-columns:1fr}
  .tiers li{grid-template-columns:1fr;gap:2px}
}
@media print{.checker,.hb-aside,.toast{display:none!important}.hb{grid-template-columns:1fr}body{background:#fff}}
`;

const LOGO = `<span class="logo-mark" aria-hidden="true"><i></i></span>Spendbook`;

function page(title, body, { desc = '', extraHead = '' } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${desc ? `<meta name="description" content="${esc(desc)}">` : ''}
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="5" y="2" width="20" height="26" rx="2" fill="#fff" stroke="#15202B" stroke-width="2.5"/><path d="M9 9h12M9 14h8" stroke="#15202B" stroke-width="2.5"/><circle cx="24" cy="25" r="6" fill="#17744A"/></svg>')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>${CSS}</style>${extraHead}</head><body>${body}</body></html>`;
}

function appbar(user, ws) {
  return `<header class="appbar"><div class="wrap">
<a class="logo" href="/app">${LOGO}</a>
<div class="who"><span>${esc(ws?.name || '')}</span><span>${esc(user.email)}</span>
<form method="post" action="/logout"><button class="linkbtn" type="submit">Log out</button></form></div>
</div></header>`;
}

// Very small, safe formatter: paragraphs, "- " bullets, "1." lists, **bold**.
export function md(text) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  let html = '';
  let para = [];
  let list = null;
  const flushPara = () => { if (para.length) { html += `<p>${para.map(inline).join('<br>')}</p>`; para = []; } };
  const flushList = () => { if (list) { html += `<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`; list = null; } };
  for (const raw of lines) {
    const l = raw.trim();
    const b = l.match(/^[-•*]\s+(.*)$/);
    const n = l.match(/^\d+[.)]\s+(.*)$/);
    if (!l) { flushPara(); flushList(); continue; }
    if (b || n) {
      flushPara();
      const type = b ? 'ul' : 'ol';
      if (!list || list.type !== type) { flushList(); list = { type, items: [] }; }
      list.items.push((b || n)[1]);
    } else {
      flushList();
      para.push(l);
    }
  }
  flushPara(); flushList();
  return html;
}

/* ---------- Landing ---------- */
export function landing() {
  const body = `
<div class="wrap">
<header class="l-nav"><a class="logo" href="/">${LOGO}</a>
<nav><a class="btn quiet small" href="/login">Log in</a><a class="btn primary small" href="/signup">Create free account</a></nav></header>

<section class="hero">
  <div>
    <h1>Your expense policy, written in Claude and kept live in Spendbook.</h1>
    <p class="lede">Ask your own Claude to draft a travel, meals or software spend policy. Spendbook saves it as a rulebook your finance team can edit, and a live handbook employees check before they spend.</p>
    <div class="ctas"><a class="btn primary" href="/signup">Create free account</a><a class="btn" href="/login">Try the demo workspace</a></div>
  </div>
  <div class="slip" aria-label="Example of Spendbook in use">
    <div class="ask"><small>You, in Claude</small>Draft a travel and meals policy for our 50-person team in India and Singapore, and save it to Spendbook.</div>
    <div class="table-wrap"><table>
      <thead><tr><th>Category</th><th>Region</th><th class="num">Limit</th></tr></thead>
      <tbody>
        <tr><td>Hotel</td><td>India</td><td class="num">₹7,000 per night</td></tr>
        <tr><td>Hotel</td><td>Singapore</td><td class="num">SGD 280 per night</td></tr>
        <tr><td>Team meals</td><td>All</td><td class="num">₹1,500 per person</td></tr>
      </tbody></table></div>
    <div class="verdict"><p>An employee checks a ₹6,400 hotel night in Pune on the live handbook.</p><span class="stamp ok">Within policy</span></div>
  </div>
</section>

<section class="how">
  <h2>How it works</h2>
  <ol>
    <li><h3>Connect once</h3><p>Paste your Spendbook link into Claude as a custom connector. It takes under a minute.</p></li>
    <li><h3>Ask Claude</h3><p>Claude drafts limits, approval tiers and rules for your countries and team size, then saves them here.</p></li>
    <li><h3>Edit and share</h3><p>Change any limit in a table. The live handbook updates straight away, and every change is logged.</p></li>
  </ol>
</section>

<section class="noai">
  <h2>No AI inside. Your Claude does the thinking.</h2>
  <p>Spendbook never calls a model and holds no AI keys. Your Claude writes and reasons; Spendbook stores the policy, applies the limits exactly, keeps the history and serves the live link. That keeps our costs flat, so pricing stays simple.</p>
</section>

<section class="pricing">
  <h2>Pricing</h2>
  <div class="plans">
    <div class="plan"><h3>Starter</h3><div class="price">Free</div><p class="hint">For a first policy</p>
      <ul><li>1 live policy</li><li>Claude connector</li><li>Spend checker for employees</li></ul></div>
    <div class="plan mid"><h3>Team</h3><div class="price">$29 <small>per month</small></div><p class="hint">For growing finance teams</p>
      <ul><li>Unlimited policies</li><li>Full change history</li><li>Your logo and domain on the handbook</li></ul></div>
    <div class="plan"><h3>Business</h3><div class="price">$99 <small>per month</small></div><p class="hint">For multi-entity companies</p>
      <ul><li>Multiple entities and currencies</li><li>Single sign-on</li><li>Export limits to card and expense tools</li></ul></div>
  </div>
</section>
</div>
<footer class="l-foot"><div class="wrap">Spendbook. Expense policies your team can actually use.</div></footer>`;
  return page('Spendbook: expense policies written in Claude, kept live', body, {
    desc: 'Ask Claude to draft your expense policy. Spendbook keeps it editable and live for your team.',
  });
}

/* ---------- Auth ---------- */
export function authPage(mode, { error = '', values = {}, demo } = {}) {
  const isLogin = mode === 'login';
  const body = `
<div class="auth">
<a class="logo" href="/">${LOGO}</a>
<div class="card">
<h1>${isLogin ? 'Log in' : 'Create your workspace'}</h1>
<p class="hint" style="margin-top:6px">${isLogin ? 'Open your policies and your Claude connector link.' : 'Free for your first policy. No card needed.'}</p>
<form method="post" action="/${mode}" style="margin-top:20px">
${error ? `<div class="error" role="alert">${esc(error)}</div>` : ''}
${isLogin ? '' : `
<div class="field"><label for="name">Your name</label><input id="name" name="name" autocomplete="name" value="${esc(values.name)}"></div>
<div class="field"><label for="company">Company</label><input id="company" name="company" autocomplete="organization" value="${esc(values.company)}"></div>`}
<div class="field"><label for="email">Work email</label><input id="email" name="email" type="email" autocomplete="email" required value="${esc(values.email)}"></div>
<div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" required minlength="8"></div>
<button class="btn primary" type="submit" style="width:100%">${isLogin ? 'Log in' : 'Create workspace'}</button>
</form>
${isLogin && demo ? `<div class="demo-hint"><strong>Demo workspace</strong><br>Email: ${esc(demo.email)}<br>Password: ${esc(demo.password)}</div>` : ''}
<p class="alt">${isLogin ? 'New to Spendbook? <a href="/signup">Create a workspace</a>' : 'Already have an account? <a href="/login">Log in</a>'}</p>
</div></div>`;
  return page(isLogin ? 'Log in to Spendbook' : 'Create a Spendbook workspace', body);
}

/* ---------- Dashboard ---------- */
export function dashboard({ user, ws, policies, base, storageMode }) {
  const mcpUrl = `${base}/mcp/${ws.mcpKey}`;
  const prompts = [
    'Draft a travel and meals expense policy for our 50-person startup in India and Singapore, and save it to Spendbook.',
    'In Spendbook, raise the Singapore hotel limit to SGD 300 per night and note that it is for peak conference season.',
    'Using our Spendbook policy, can I expense a ₹7,500 hotel night in Mumbai?',
  ];
  const list = policies.length
    ? `<ul class="pol-list">${policies.map((p) => `
<li class="pol"><div>
<h3><a href="/app/p/${esc(p.id)}">${esc(p.title)}</a></h3>
<div class="meta"><span>${esc(p.company || 'No company set')}</span><span>Version ${p.version}</span><span>Updated ${esc(fmtDateTime(p.updated_at))}</span>${String(p.created_by).includes('Claude') ? '<span class="badge-claude">Drafted by Claude</span>' : ''}</div>
</div>
<div class="acts"><a class="btn small" href="/app/p/${esc(p.id)}">Edit</a><a class="btn small quiet" href="/p/${esc(p.slug)}" target="_blank" rel="noopener">Live handbook</a></div></li>`).join('')}</ul>`
    : `<div class="empty"><h3>No policies yet</h3><p>Connect Spendbook to Claude using the steps on this page, then ask Claude to draft your first policy. It will appear here within a few seconds.</p>
<form method="post" action="/app/new"><button class="btn" type="submit">Start a blank policy</button></form></div>`;

  const body = `${appbar(user, ws)}
<main class="wrap dash">
<section>
<div class="dash-head"><h1>Expense policies</h1>${policies.length ? '<form method="post" action="/app/new"><button class="btn small" type="submit">Start a blank policy</button></form>' : ''}</div>
${list}
</section>
<aside class="connect" aria-labelledby="connect-h">
<h2 id="connect-h">Connect your Claude</h2>
<ol>
<li>In Claude, open Settings, then Connectors, and add a custom connector.</li>
<li>Name it Spendbook and paste this connector URL:
<div class="copyrow"><input id="mcp-url" readonly value="${esc(mcpUrl)}" aria-label="Connector URL"><button class="btn small" data-copy="#mcp-url">Copy</button></div></li>
<li>In a new chat, make sure Spendbook is switched on, then ask:
<ul class="prompts">${prompts.map((t, i) => `<li><span id="pr${i}">${esc(t)}</span><button class="btn small quiet" data-copy-text="${esc(t)}">Copy</button></li>`).join('')}</ul></li>
</ol>
<p class="store ${storageMode === 'memory' ? 'warn' : ''}">${storageMode === 'memory' ? 'Storage is not connected, so data will reset. Add Upstash Redis to this project.' : 'Saved to your workspace database.'}</p>
</aside>
</main>
<script>
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-copy],[data-copy-text]'); if(!b) return;
  const t=b.dataset.copyText ?? document.querySelector(b.dataset.copy).value;
  try{await navigator.clipboard.writeText(t)}catch{const i=document.querySelector(b.dataset.copy); if(i){i.select();document.execCommand('copy')}}
  const o=b.textContent; b.textContent='Copied'; setTimeout(()=>b.textContent=o,1400);
});
let sig=${JSON.stringify(policies.map((p) => p.id + ':' + p.version).join(','))};
setInterval(async()=>{
  if(document.visibilityState!=='visible') return;
  try{const r=await fetch('/api/policies',{cache:'no-store'}); if(!r.ok) return; const j=await r.json();
  if(j.signature!==sig){location.reload()}}catch{}
},5000);
</script>`;
  return page('Your policies | Spendbook', body);
}

/* ---------- Editor ---------- */
export function editor({ user, ws, policy }) {
  const body = `${appbar(user, ws)}
<main class="wrap">
<div class="ed-top">
<a href="/app">All policies</a>
<div class="ed-actions"><span id="status" class="save-status" aria-live="polite">All changes saved</span>
<a class="btn small quiet" href="/p/${esc(policy.slug)}" target="_blank" rel="noopener">Open live handbook</a>
<button id="save" class="btn primary small" type="button">Save changes</button></div>
</div>
<div id="banner" class="banner" role="status"><span id="banner-text"></span><button class="btn small" id="banner-load" type="button">Load latest</button></div>
<div class="ed-title"><h1 id="h-title"></h1><div class="meta" id="h-meta"></div></div>

<section class="panel"><div class="panel-head"><h2>Details</h2></div>
<div class="grid2">
<div class="field"><label for="f-title">Policy title</label><input id="f-title" data-k="title"></div>
<div class="field"><label for="f-company">Company</label><input id="f-company" data-k="company"></div>
</div>
<div class="grid4">
<div class="field"><label for="f-regions">Regions covered</label><input id="f-regions" data-k="regions" placeholder="India, Singapore"></div>
<div class="field"><label for="f-currency">Base currency</label><input id="f-currency" data-k="currency" maxlength="3" placeholder="INR"></div>
<div class="field"><label for="f-eff">Effective date</label><input id="f-eff" data-k="effective_date" type="date"></div>
<div class="field"><label for="f-ver">Version</label><input id="f-ver" disabled></div>
</div>
<div class="field"><label for="f-summary">Summary for employees</label><textarea id="f-summary" data-k="summary" style="min-height:80px"></textarea></div>
</section>

<section class="panel"><div class="panel-head"><h2>Spending limits</h2><button class="btn small" id="add-cat" type="button">Add a limit</button></div>
<p class="hint">One row per category and region. Leave the limit empty for no cap. Leave currency empty to use the base currency.</p>
<div class="table-wrap"><table class="ed-table"><thead><tr><th>Category</th><th>Region</th><th>Limit</th><th>Currency</th><th>Applies</th><th class="c">Receipt</th><th class="c">Approve first</th><th>Rule for employees</th><th><span class="sr">Remove</span></th></tr></thead><tbody id="cats"></tbody></table></div>
<datalist id="units">${UNITS.map((u) => `<option value="${esc(u)}">`).join('')}</datalist>
</section>

<section class="panel"><div class="panel-head"><h2>Approval tiers</h2><button class="btn small" id="add-tier" type="button">Add a tier</button></div>
<p class="hint">Claims up to each amount (in the base currency) go to this approver. Leave the amount empty for the top tier.</p>
<div class="table-wrap"><table class="ed-table"><thead><tr><th>Up to</th><th>Approver</th><th>Turnaround</th><th><span class="sr">Remove</span></th></tr></thead><tbody id="tiers"></tbody></table></div>
</section>

<section class="panel"><div class="panel-head"><h2>Policy text</h2><button class="btn small" id="add-sec" type="button">Add a section</button></div>
<p class="hint">Start a line with "- " to make a bullet point.</p>
<div id="secs"></div>
</section>

<section class="panel"><div class="panel-head"><h2>Change history</h2></div><ul class="hist" id="hist"></ul></section>
<div class="danger-zone"><button class="btn danger small" id="del" type="button">Delete this policy</button></div>
</main>
<script type="application/json" id="data">${jsonForScript(policy)}</script>
<script>
(()=>{
let P=JSON.parse(document.getElementById('data').textContent);
let dirty=false, saving=false;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rid=()=>Math.random().toString(36).slice(2,10);
const when=iso=>new Date(iso).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'})+' IST';
function setDirty(v){dirty=v;const s=$('#status');s.textContent=v?'Unsaved changes':'All changes saved';s.classList.toggle('dirty',v)}
function header(){ $('#h-title').textContent=P.title||'Untitled policy';
  $('#h-meta').textContent='Version '+P.version+', last changed '+when(P.updated_at)+(P.history&&P.history[0]?' by '+P.history[0].by:''); $('#f-ver').value=P.version; }
function fields(){ $('#f-title').value=P.title||''; $('#f-company').value=P.company||''; $('#f-regions').value=(P.regions||[]).join(', ');
  $('#f-currency').value=P.currency||''; $('#f-eff').value=/^\\d{4}-\\d{2}-\\d{2}$/.test(P.effective_date||'')?P.effective_date:''; $('#f-summary').value=P.summary||''; }
function cats(){ $('#cats').innerHTML=P.categories.map((c,i)=>'<tr data-i="'+i+'">'+
  '<td><input aria-label="Category" data-c="name" value="'+esc(c.name)+'" style="min-width:130px"></td>'+
  '<td><input aria-label="Region" data-c="region" value="'+esc(c.region)+'" style="min-width:100px"></td>'+
  '<td><input aria-label="Limit" data-c="limit" inputmode="decimal" value="'+(c.limit??'')+'" placeholder="No cap" style="min-width:90px"></td>'+
  '<td><input aria-label="Currency" data-c="currency" maxlength="3" value="'+esc(c.currency)+'" placeholder="'+esc(P.currency)+'" style="width:72px"></td>'+
  '<td><input aria-label="Applies" data-c="unit" list="units" value="'+esc(c.unit)+'" style="min-width:110px"></td>'+
  '<td class="c"><input aria-label="Receipt required" type="checkbox" data-c="receipt_required" '+(c.receipt_required?'checked':'')+'></td>'+
  '<td class="c"><input aria-label="Approve before spending" type="checkbox" data-c="pre_approval" '+(c.pre_approval?'checked':'')+'></td>'+
  '<td><input aria-label="Rule for employees" data-c="notes" value="'+esc(c.notes)+'" style="min-width:220px"></td>'+
  '<td><button class="rm" type="button" aria-label="Remove '+esc(c.name)+'" data-rm="cat">×</button></td></tr>').join(''); }
function tiers(){ $('#tiers').innerHTML=P.approvals.map((t,i)=>'<tr data-i="'+i+'">'+
  '<td><input aria-label="Up to" data-t="up_to" inputmode="decimal" value="'+(t.up_to??'')+'" placeholder="Anything above" style="min-width:120px"></td>'+
  '<td><input aria-label="Approver" data-t="approver" value="'+esc(t.approver)+'" style="min-width:160px"></td>'+
  '<td><input aria-label="Turnaround" data-t="sla" value="'+esc(t.sla)+'" style="min-width:160px"></td>'+
  '<td><button class="rm" type="button" aria-label="Remove tier" data-rm="tier">×</button></td></tr>').join(''); }
function secs(){ $('#secs').innerHTML=P.sections.map((s,i)=>'<div class="sec" data-i="'+i+'"><div class="sec-head"><input aria-label="Section heading" data-s="heading" value="'+esc(s.heading)+'"><button class="rm" type="button" aria-label="Remove section" data-rm="sec">×</button></div>'+
  '<textarea aria-label="Section text" data-s="body">'+esc(s.body)+'</textarea></div>').join('') || '<p class="hint">No sections yet.</p>'; }
function hist(){ $('#hist').innerHTML=(P.history||[]).map(h=>'<li><span class="by">'+esc(h.by)+'</span> <span class="when">'+esc(when(h.at))+'</span><br>'+esc(h.summary)+'</li>').join(''); }
function all(){header();fields();cats();tiers();secs();hist();}
all();

document.addEventListener('input',e=>{
  const t=e.target; const row=t.closest('[data-i]'); const i=row?+row.dataset.i:-1;
  const val=t.type==='checkbox'?t.checked:t.value;
  if(t.dataset.k){ const k=t.dataset.k; P[k]=k==='regions'?val.split(',').map(s=>s.trim()).filter(Boolean):(k==='currency'?val.toUpperCase():val); if(k==='title') $('#h-title').textContent=val||'Untitled policy'; }
  else if(t.dataset.c){ const k=t.dataset.c; P.categories[i][k]=k==='limit'?(val===''?null:Number(String(val).replace(/[^0-9.]/g,''))):(k==='currency'?String(val).toUpperCase():val); }
  else if(t.dataset.t){ const k=t.dataset.t; P.approvals[i][k]=k==='up_to'?(val===''?null:Number(String(val).replace(/[^0-9.]/g,''))):val; }
  else if(t.dataset.s){ P.sections[i][t.dataset.s]=val; }
  else return;
  setDirty(true);
});
document.addEventListener('change',e=>{ if(e.target.type==='checkbox') e.target.dispatchEvent(new Event('input',{bubbles:true})); });
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-rm]'); if(!b) return; const i=+b.closest('[data-i]').dataset.i;
  if(b.dataset.rm==='cat'){P.categories.splice(i,1);cats();}
  if(b.dataset.rm==='tier'){P.approvals.splice(i,1);tiers();}
  if(b.dataset.rm==='sec'){P.sections.splice(i,1);secs();}
  setDirty(true);
});
$('#add-cat').onclick=()=>{P.categories.push({id:rid(),name:'',region:(P.regions&&P.regions[0])||'All',limit:null,currency:'',unit:'per claim',receipt_required:true,pre_approval:false,notes:''});cats();setDirty(true);const r=$('#cats').lastElementChild;r&&r.querySelector('input').focus();};
$('#add-tier').onclick=()=>{P.approvals.push({id:rid(),up_to:null,approver:'',sla:''});tiers();setDirty(true);};
$('#add-sec').onclick=()=>{P.sections.push({id:rid(),heading:'New section',body:''});secs();setDirty(true);};

async function save(){
  if(saving) return; saving=true; $('#save').disabled=true; $('#status').textContent='Saving';
  try{
    const r=await fetch('/api/policies/'+P.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      title:P.title,company_name:P.company,currency:P.currency,regions:P.regions,effective_date:P.effective_date,summary:P.summary,
      categories:P.categories.filter(c=>String(c.name||'').trim()),approval_tiers:P.approvals.filter(t=>String(t.approver||'').trim()),sections:P.sections,base_version:P.version})});
    const j=await r.json(); if(!r.ok) throw new Error(j.error||'Save failed');
    P=j.policy; all(); setDirty(false); $('#status').textContent=j.changed?'Saved as version '+P.version:'No changes to save';
    $('#banner').classList.remove('show');
  }catch(err){ $('#status').textContent=err.message; $('#status').classList.add('dirty'); }
  finally{ saving=false; $('#save').disabled=false; }
}
$('#save').onclick=save;
document.addEventListener('keydown',e=>{ if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();save();} });
window.addEventListener('beforeunload',e=>{ if(dirty){e.preventDefault();e.returnValue='';} });
$('#del').onclick=async()=>{ if(!confirm('Delete this policy and its live handbook? This cannot be undone.')) return;
  const r=await fetch('/api/policies/'+P.id,{method:'DELETE'}); if(r.ok) location.href='/app'; };

let latest=null;
setInterval(async()=>{
  if(document.visibilityState!=='visible'||saving) return;
  try{ const r=await fetch('/api/policies/'+P.id,{cache:'no-store'}); if(!r.ok) return; const j=await r.json();
    if(j.policy.version>P.version){
      if(!dirty){ P=j.policy; all(); $('#status').textContent='Updated to version '+P.version+' by '+(P.history[0]?P.history[0].by:'someone'); }
      else { latest=j.policy; $('#banner-text').textContent='Version '+j.policy.version+' was just saved by '+(j.policy.history[0]?j.policy.history[0].by:'someone')+'. Loading it will discard your unsaved edits.'; $('#banner').classList.add('show'); }
    } }catch{}
},4000);
$('#banner-load').onclick=()=>{ if(latest){P=latest;all();setDirty(false);} $('#banner').classList.remove('show'); };
})();
</script>`;
  return page(`${policy.title} | Spendbook`, body);
}

/* ---------- Public live handbook ---------- */
export function handbook(p) {
  const pc = p.currency;
  const regions = [...new Set(p.categories.map((c) => c.region))];
  const limitRows = regions.map((r) => {
    const rows = p.categories.filter((c) => c.region === r).map((c) => `<tr>
<td>${esc(c.name)}</td>
<td class="amt">${c.limit === null ? 'No cap' : esc(fmtMoney(c.limit, c.currency || pc))} <span class="unit">${c.limit === null ? '' : esc(c.unit)}</span></td>
<td>${c.receipt_required ? 'Required' : 'Not needed'}</td>
<td>${c.pre_approval ? 'Get approval first' : 'No'}</td>
<td class="rule">${esc(c.notes)}</td></tr>`).join('');
    return (regions.length > 1 || r !== 'All' ? `<tr class="region-row"><td colspan="5">${esc(r)}</td></tr>` : '') + rows;
  }).join('');
  const tiers = sortTiers(p.approvals);
  let prev = null;
  const tierItems = tiers.map((t) => {
    const band = t.up_to === null
      ? (prev === null ? 'Any amount' : `Above ${fmtMoney(prev, pc)}`)
      : `Up to ${fmtMoney(t.up_to, pc)}`;
    if (t.up_to !== null) prev = t.up_to;
    return `<li><span class="band">${esc(band)}</span><span>${esc(t.approver)}${t.sla ? `<br><span class="sla">${esc(t.sla)}</span>` : ''}</span></li>`;
  }).join('');

  const options = regions.map((r) => `<optgroup label="${esc(r)}">${p.categories.map((c, i) => c.region === r ? `<option value="${i}">${esc(c.name)}${regions.length > 1 ? ` (${esc(r)})` : ''}</option>` : '').join('')}</optgroup>`).join('');

  const body = `
<header class="hb-head"><div class="wrap">
<div class="hb-company">${esc(p.company || 'Company policy')}</div>
<h1>${esc(p.title)}</h1>
<div class="hb-meta"><span>Version ${p.version}</span><span>Last updated ${esc(fmtDate(p.updated_at))}</span>${p.effective_date ? `<span>Effective ${esc(fmtDate(p.effective_date))}</span>` : ''}${(p.regions || []).map((r) => `<span class="chip">${esc(r)}</span>`).join('')}</div>
</div></header>
<main class="wrap hb">
<div class="hb-doc">
${p.summary ? `<p class="hb-summary">${esc(p.summary)}</p>` : ''}
${p.categories.length ? `<section><h2>Spending limits</h2><div class="table-wrap"><table class="limits"><thead><tr><th>Category</th><th>Limit</th><th>Receipt</th><th>Approval before spending</th><th>Rule</th></tr></thead><tbody>${limitRows}</tbody></table></div></section>` : ''}
${tiers.length ? `<section><h2>Who approves your claim</h2><ul class="tiers">${tierItems}</ul><p class="hint" style="margin-top:10px">Amounts in ${esc(pc)}.</p></section>` : ''}
${p.sections.map((s) => `<section><h2>${esc(s.heading)}</h2><div class="prose">${md(s.body)}</div></section>`).join('')}
</div>
${p.categories.length ? `<aside class="hb-aside"><div class="checker">
<h2>Can I expense this?</h2>
<p class="hint">Check a cost against this policy before you spend.</p>
<div class="field"><label for="ck-cat">What is it for?</label><select id="ck-cat">${options}</select></div>
<div class="field"><label for="ck-amt">Amount</label><div class="amount"><span id="ck-cur">${esc(pc)}</span><input id="ck-amt" inputmode="decimal" placeholder="0" autocomplete="off"></div></div>
<div class="result" id="ck-res" aria-live="polite"><p class="idle">Enter an amount to see the answer.</p></div>
</div></aside>` : ''}
</main>
<footer class="hb-foot"><div class="wrap">${p.history && p.history[0] ? `Latest change: ${esc(p.history[0].summary)} (${esc(p.history[0].by)}, ${esc(fmtDateTime(p.history[0].at))}). ` : ''}Kept live with <a href="/">Spendbook</a>.</div></footer>
<div class="toast" id="toast" role="status"><span id="toast-t"></span><button type="button" onclick="location.reload()">Show it</button></div>
<script type="application/json" id="data">${jsonForScript({ slug: p.slug, version: p.version, currency: pc, categories: p.categories, approvals: tiers })}</script>
<script>
(()=>{
const D=JSON.parse(document.getElementById('data').textContent);
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function money(a,c){ try{return new Intl.NumberFormat(c==='INR'?'en-IN':'en',{style:'currency',currency:c,maximumFractionDigits:a%1?2:0}).format(a)}catch{return c+' '+a} }
function run(){
  const sel=$('#ck-cat'), amtEl=$('#ck-amt'); if(!sel) return;
  const c=D.categories[+sel.value]; const cur=c.currency||D.currency; $('#ck-cur').textContent=cur;
  const raw=amtEl.value.replace(/[^0-9.]/g,''); const res=$('#ck-res');
  if(!raw){res.innerHTML='<p class="idle">Enter an amount to see the answer.</p>';return}
  const a=Number(raw); const within=c.limit===null||a<=c.limit;
  let stamp, line;
  if(c.limit===null && c.pre_approval){stamp='<span class="stamp warn">Approve first</span>';line='There is no set limit for '+esc(c.name)+', but you need approval before you spend.'}
  else if(c.limit===null){stamp='<span class="stamp ok">No cap</span>';line='There is no set limit for '+esc(c.name)+'. Keep it reasonable and business-related.'}
  else if(within && c.pre_approval){stamp='<span class="stamp warn">Approve first</span>';line=money(a,cur)+' is within the '+money(c.limit,cur)+' '+esc(c.unit)+' limit, but this category needs approval before you spend.'}
  else if(within){stamp='<span class="stamp ok">Within policy</span>';line=money(a,cur)+' is within the '+money(c.limit,cur)+' '+esc(c.unit)+' limit.'}
  else {stamp='<span class="stamp bad">Over limit</span>';line=money(a,cur)+' is '+money(+(a-c.limit).toFixed(2),cur)+' over the '+money(c.limit,cur)+' '+esc(c.unit)+' limit. You need an exception approved before you spend.'}
  const items=[];
  items.push(c.receipt_required?'Keep the receipt or invoice.':'No receipt needed.');
  if(cur===D.currency && D.approvals.length){ const t=D.approvals.find(t=>t.up_to===null||a<=t.up_to)||D.approvals[D.approvals.length-1];
    items.push('Approver: '+esc(t.approver)+(t.sla?' ('+esc(t.sla)+')':'')+'.'); }
  else if(D.approvals.length){ items.push('Approval tiers are set in '+esc(D.currency)+'. Ask finance who approves '+esc(cur)+' claims.'); }
  if(c.notes) items.push(esc(c.notes));
  res.innerHTML=stamp+'<p style="margin-top:12px">'+line+'</p><ul>'+items.map(i=>'<li>'+i+'</li>').join('')+'</ul>';
}
if($('#ck-cat')){ $('#ck-cat').addEventListener('change',run); $('#ck-amt').addEventListener('input',run); run(); }
setInterval(async()=>{
  if(document.visibilityState!=='visible') return;
  try{const r=await fetch('/api/live/'+D.slug,{cache:'no-store'}); if(!r.ok) return; const j=await r.json();
    if(j.version>D.version){ if(!$('#ck-amt')||!$('#ck-amt').value){location.reload()} else {$('#toast-t').textContent='This policy was just updated to version '+j.version+'.';$('#toast').classList.add('show')} } }catch{}
},6000);
})();
</script>`;
  return page(`${p.title} | ${p.company || 'Spendbook'}`, body, { desc: p.summary || '' });
}

export function notFound(msg = 'This page does not exist.') {
  return page('Not found | Spendbook', `<div class="auth"><a class="logo" href="/">${LOGO}</a><div class="card"><h1>Not found</h1><p class="hint" style="margin-top:8px">${esc(msg)}</p><p style="margin-top:16px"><a href="/">Go to Spendbook</a></p></div></div>`);
}
