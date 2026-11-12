# Spendbook

Live, editable expense policies for growing teams.

Spendbook is an MCP server and web app. A finance lead connects their AI assistant(Claude) to Spendbook and asks it to draft a travel, meals or software spend policy. Spendbook stores the result as structured rules (limits per category and region, approval tiers, receipt rules), lets the team edit them in a table, publishes a live handbook employees can check before they spend, and keeps a versioned change log.

The app makes no model calls and holds no AI API keys. The assistant does the drafting; Spendbook is the system of record.

## Live demo

- App: https://spendbook-ten.vercel.app
- Demo login: `demo@spendbook.app` / `Volopay@2026`
- MCP endpoint: https://spendbook-ten.vercel.app/mcp/volopay-demo

## Try it

1. Add the MCP endpoint above as a custom connector in any MCP-compatible AI assistant. The demo workspace needs no authentication.
2. Ask: "Draft a travel and meals expense policy for a 50-person startup in India and Singapore, and save it to Spendbook."
3. Open the editor or live handbook link it returns, or log in with the demo account.
4. Edit any limit and save. The handbook updates and the change is logged.
5. Try follow-ups such as "In Spendbook, raise the Singapore hotel limit to SGD 300 per night" or "Using Spendbook, can I expense a 7,500 INR hotel night in Mumbai?"

Anyone can sign up at `/signup` to get their own workspace and a private MCP URL.

## Features

- **MCP server** at `/mcp/<workspace-key>` (Streamable HTTP, stateless JSON-RPC) with five tools:
  - `create_policy` saves a drafted policy with limits, approval tiers and policy text.
  - `list_policies` and `get_policy` read the current version, including edits made in the app and the change history.
  - `update_policy` makes targeted changes (one limit or one section at a time), so edits made by people are not overwritten.
  - `check_expense` checks a specific expense against the stored rules and returns the verdict, receipt rules and approver.
- **Editor** (`/app/p/<id>`): edit every field, limit and section. Each save creates a new version with a readable change log. If the policy changes through MCP while the editor is open, the editor refreshes within seconds.
- **Live handbook** (`/p/<slug>`): public and mobile-friendly, with a "Can I expense this?" checker. It refreshes when the policy changes.
- **Accounts**: sign-up creates a workspace with its own private MCP URL. A demo workspace is created automatically.

## Design decisions

- **Rules as data, not a document.** Limits are stored per category and region, so they can be checked, versioned and later exported to card or expense tools.
- **Deterministic checks.** Expense checks apply the stored rules exactly. No model is involved in the verdict.
- **Safe concurrent edits.** Updates through MCP read the latest version first and change only the rows named, so a person's edit and an assistant's edit can both land without one overwriting the other.

## Stack

Plain Node.js with no framework and no npm dependencies, deployed as one Vercel serverless function, with Upstash Redis (REST API) for storage.

```
api/index.js     router: pages, JSON API, MCP endpoint
lib/mcp.js       MCP protocol and tools
lib/policy.js    policy model, change log, expense check
lib/data.js      users, workspaces, policies
lib/store.js     Upstash Redis REST client (in-memory fallback for local dev)
lib/auth.js      scrypt password hashing, signed session cookies
lib/views.js     HTML and CSS for every screen
server.js        local development server
```

## Run locally

```
npm run dev
```

Open http://localhost:3000 and log in with `demo@spendbook.app` / `Volopay@2026`. The local MCP endpoint is http://localhost:3000/mcp/volopay-demo.

Without Upstash credentials the app stores data in memory, so it resets on restart.

## Deploy

1. Import the repository into Vercel with the "Other" preset.
2. In the project's Storage tab, add Upstash for Redis and connect it to the project.
3. Redeploy, then open `/health`. It should return `"storage":"upstash"`.

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) | Yes, in production | Set automatically when Upstash Redis is connected in Vercel |
| `DEMO_PASSWORD` | No | Demo login password (default `Volopay@2026`) |
| `DEMO_MCP_KEY` | No | Demo connector key (default `volopay-demo`) |
| `SESSION_SECRET` | No | Cookie signing secret (derived from the Redis token if unset) |
| `SHOW_DEMO_LOGIN` | No | Set to `false` to hide the demo credentials on the login page |
