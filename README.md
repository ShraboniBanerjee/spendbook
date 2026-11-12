# Spendbook

Expense policies written in Claude, kept live in Spendbook.

A finance lead connects their own Claude to Spendbook through MCP and asks it to draft a travel, meals or software spend policy. Claude does the thinking and writing. Spendbook stores the policy, lets people edit it in a table, publishes a live handbook employees can check before they spend, and logs every change.

**No AI inside.** The app holds no OpenAI, Anthropic or other AI keys and never calls a model. `grep -ri "anthropic\|openai" api lib` returns nothing.

## What it does

- **MCP server** at `/mcp/<workspace-key>` (Streamable HTTP, stateless JSON-RPC). Five tools:
  - `create_policy`: Claude saves a drafted policy (limits per category and region, approval tiers, policy text).
  - `list_policies`, `get_policy`: Claude reads the current version, including human edits and change history.
  - `update_policy`: targeted edits (upsert one limit or section) so human edits are not overwritten.
  - `check_expense`: deterministic rule check ("Can I expense ₹7,500 for a hotel night in Mumbai?").
- **Editor** (`/app/p/<id>`): edit every field, limit and section; save creates a new version with a readable change log. If Claude changes the policy while the editor is open, it updates within seconds.
- **Live handbook** (`/p/<slug>`): public, mobile-friendly, with a "Can I expense this?" checker. Refreshes itself when the policy changes.
- **Accounts**: sign-up creates a workspace with its own private MCP URL. A demo workspace is seeded automatically.

## Stack

Plain Node.js (no framework, no npm dependencies), one Vercel serverless function (`api/index.js`), Upstash Redis over its REST API for storage.

```
api/index.js     router: pages, JSON API, MCP endpoint
lib/mcp.js       MCP protocol + tools
lib/policy.js    policy model, change log, expense check
lib/data.js      users, workspaces, policies
lib/store.js     Upstash Redis REST client (in-memory fallback locally)
lib/auth.js      scrypt passwords, signed session cookies
lib/views.js     HTML and CSS for every screen
server.js        local dev server
```

## Run locally

```
npm run dev
# open http://localhost:3000  (demo@spendbook.app / Volopay@2026)
# MCP endpoint: http://localhost:3000/mcp/volopay-demo
```

Without Upstash credentials the app uses memory, so data resets on restart.

## Environment variables

| Name | Needed | Purpose |
|---|---|---|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) | Yes, in production | Set automatically when you add Upstash Redis in Vercel |
| `DEMO_PASSWORD` | Optional | Demo login password (default `Volopay@2026`) |
| `DEMO_MCP_KEY` | Optional | Demo connector key (default `volopay-demo`) |
| `SESSION_SECRET` | Optional | Cookie signing secret (derived from the Redis token if unset) |
| `SHOW_DEMO_LOGIN` | Optional | Set to `false` to hide demo credentials on the login page |

Check `/health` after deploying: it should say `"storage":"upstash"`.
