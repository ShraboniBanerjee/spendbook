# Spendbook: Volopay submission pack

Deadline: 9:30 AM IST, 12 Nov 2026.

## 1. Deploy (about 15 minutes)

1. **GitHub.** Go to github.com/new, create a repository called `spendbook` (public or private), then choose "uploading an existing file". Unzip `spendbook.zip` and drag everything inside the `spendbook` folder (the `api` and `lib` folders plus all files) into the page. Commit.
2. **Vercel.** Go to vercel.com, sign in with GitHub, choose Add New, then Project, and import `spendbook`. Leave every setting as it is and click Deploy.
3. **Database.** In the Vercel project, open the Storage tab, choose Create Database, pick **Upstash for Redis** (free plan), and connect it to the project (all environments).
4. **Redeploy** so the database settings apply: Deployments tab, the three-dot menu on the latest deployment, Redeploy.
5. **Check it.** Open `https://YOUR-APP.vercel.app/health`. It must say `"storage":"upstash"`. If it says `memory`, the database is not connected yet (repeat steps 3 and 4).
6. **Make sure reviewers can open it.** Open the site in a private browser window. If Vercel asks you to log in, go to Settings, Deployment Protection, and turn off Vercel Authentication.

Alternative if you have Node installed: `cd spendbook && npx vercel --prod`, then do steps 3 to 6.

## 2. Connect your Claude and test (5 minutes)

1. In Claude, open Settings, then Connectors, and add a custom connector.
2. Name: `Spendbook`. URL: `https://YOUR-APP.vercel.app/mcp/volopay-demo`. No authentication. Add it.
3. Start a new chat, make sure Spendbook is switched on in the tools menu, and send:
   "Draft a travel and meals expense policy for a 50-person startup in India and Singapore, and save it to Spendbook."
4. Approve the tool call. Claude replies with an editor link and a live handbook link.
5. Log in at `https://YOUR-APP.vercel.app/login` with `demo@spendbook.app` / `Volopay@2026` and you will see the policy.

Run this once before recording so you know it works end to end.

## 3. What to paste into the submission form

**Live app:** `https://YOUR-APP.vercel.app`
**Test login:** `demo@spendbook.app` / `Volopay@2026`

**MCP link and steps:**

```
MCP URL: https://YOUR-APP.vercel.app/mcp/volopay-demo

1. In Claude, open Settings > Connectors > Add custom connector.
2. Name it Spendbook, paste the URL above (no authentication needed), and add it.
3. In a new chat, make sure Spendbook is switched on, then ask:
   "Draft a travel and meals expense policy for a 50-person startup in India and Singapore, and save it to Spendbook."
4. Open the editor or live handbook link Claude returns, or log in at
   https://YOUR-APP.vercel.app/login (demo@spendbook.app / Volopay@2026).
5. Edit any limit and save. The live handbook updates and the change is logged.
6. Then try: "In Spendbook, raise the Singapore hotel limit to SGD 300 per night"
   and "Using Spendbook, can I expense a 7,500 INR hotel night in Mumbai?"

Anyone can also create their own workspace at /signup and get a private MCP URL.
```

## 4. Demo run-sheet (record this part, about 2 minutes)

Set up before recording: Claude in one window, Spendbook dashboard (logged in) in another. Delete any test policies so the dashboard starts clean.

1. **Claude creates it.** Paste prompt 1 into Claude. While Claude works, say what is happening: "Claude is drafting limits per country, approval tiers and the policy text, then saving it through MCP." Switch to the dashboard: the policy appears on its own within a few seconds, marked "Drafted by Claude".
2. **Employees use it.** Open the live handbook. In "Can I expense this?" choose Hotel (India), type 6400 (Within policy), then 9000 (Over limit, with the approver shown). Point out it is mobile-friendly and public.
3. **A person edits it.** Open the editor, change one limit (for example Team meals to 1,800), click Save changes. Show the version number go up and the change history line, then the handbook showing the new limit.
4. **Claude edits it again, without overwriting the human.** Keep the editor open. In Claude: "In Spendbook, raise the Singapore hotel limit to SGD 300 per night for peak conference season." Claude reads the latest version first, then changes only that row. The open editor updates by itself, and the history shows both your edit and Claude's.
5. **Claude answers from the source of truth.** In Claude: "Using Spendbook, can I expense a 7,500 INR hotel night in Mumbai?" Claude calls check_expense; the app applies the stored rule exactly.

## 5. Pitch script for Shraboni (5 minutes)

About 600 words spoken, plus the demo. Everything below comes from Shraboni's resume, so no placeholders are left. Read it aloud once and change any phrase that doesn't sound like her.

**Who I am (0:00 to 0:30)**
"Hi, I'm Shraboni Banerjee, a software engineer with over three years of experience building production full-stack and backend systems. For the last two years I was at Tech Sprint, building the RestoGenius platform for Australian hospitality venues: the POS, the ordering flows, and the mobile apps on iOS and Android. Before that I built B2B SaaS features at Computer Solutions East and a hotel management system at Adevu. What I care about most right now is connecting AI to real systems safely, which is exactly what this brief asks for."

**My best work (0:30 to 1:15)**
"The work I'm proudest of is the ordering and payments layer of the RestoGenius POS, which runs in more than ten Australian venues. I built the kiosk, online ordering, loyalty and payment flows, and the Uber Eats integration that brings delivery orders straight into the same POS. I also added role-based access control and multi-restaurant switching, so one owner can run several venues from one login. Working on money flows taught me that correctness and edge cases matter more than feature count. The same discipline shows in a migration I ran at Computer Solutions East: more than 60,000 production records moved into a redesigned PostgreSQL schema with zero data loss and no downtime."

**The business and why it wins (1:15 to 2:15)**
"This is Spendbook. It turns your own Claude into your company's expense policy writer, and keeps that policy live.

Most startups in India and Southeast Asia keep their expense policy in a Google Doc that nobody reads. Employees guess, finance chases exceptions, and the doc is out of date soon after it's written.

With Spendbook, a finance lead asks Claude to draft a policy for their countries and team size. Claude does the thinking. Spendbook stores the result as structured rules: limits per category and region, approval tiers and receipt rules. Finance edits it like a spreadsheet, employees check a cost before they spend, and every change is versioned.

I think it wins for three reasons. First, there is no AI cost: the customer's own Claude does the work, so our cost per customer is close to zero and we can price below document tools. Second, it stores rules as data, not as a document, so they can be checked, versioned and later pushed into card limits. Third, distribution: expense policy templates for India and Singapore are something finance leads already search for, and accounting firms can roll it out to their clients.

And for Volopay specifically: every company that writes a policy in Spendbook is actively setting spend rules. That is exactly when it needs corporate cards with limits built in. Spendbook could be a free top-of-funnel tool that exports its limits straight into Volopay's card controls."

**Live demo (2:15 to 4:15)**
Follow the run-sheet in section 4. Close the demo with one line on how it's built (about 15 seconds):
"Under the hood, I wrote the MCP server myself over Streamable HTTP. It runs as one serverless function with zero npm dependencies and Redis for storage, and there are no AI keys anywhere in the app. Claude thinks; Spendbook keeps the record."

**Economics (4:15 to 5:00)**
"Pricing is free for one policy, $29 a month for teams and $99 for multi-entity companies.
On costs, there are no model costs at all, because the customer brings their own Claude. The whole app is one serverless function and one Redis database, both on free tiers today. Even at a thousand paying workspaces, I'd expect infrastructure to cost a few hundred dollars a month, so gross margin stays above 90 percent. As an illustration, a thousand workspaces at a blended $40 a month is about $40,000 in monthly revenue.
Acquisition comes from content and accounting partners rather than paid ads, so I'd aim to recover acquisition costs within a few months.
Thank you. The live app and the MCP link are in my submission."

## 6. Recording tips

- Loom or any screen recorder is fine. Record the demo first, then the talking parts, and trim.
- Zoom the browser to 125 percent so text is readable.
- If Claude asks permission for a tool, choose to allow it so the demo flows.
- Keep it under 5 minutes; rehearse the demo twice.

## 7. If something goes wrong

- **Claude cannot connect:** check the URL ends in `/mcp/volopay-demo` and opens without a Vercel login page in a private window.
- **Data disappears:** `/health` shows `memory`. Connect Upstash and redeploy.
- **Policy did not appear on the dashboard:** refresh. It checks for changes every 5 seconds while the tab is open.
