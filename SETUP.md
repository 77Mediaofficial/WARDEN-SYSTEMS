# Setup walkthrough (Windows)

Get the console live end-to-end. **Part A alone** proves the core — auth + the server-signed,
tamper-evident ledger. Parts B (thermal feed) and C (telemetry) are optional add-ons.

> You run all of this — I never touch your database. Nothing here needs a drone or any budget.

---

## ✅ Backend already provisioned (WARDEN SYSTEMS · `bhzrnzsrqslmvcrreuro`, 2026-07-14)
Done for you via the Supabase MCP: **schema applied** (5 tables, FORCE RLS, append-only ledger),
**signing secret generated in-DB** (`app_secrets`, service-role-only — no env secret needed), **three
edge functions deployed & armed** (return `401` = live), and the **anon key wired into
`web/index.html`**. The console loads and shows the sign-in gate. All that's left is three quick things:

1. **Allow-list the login redirect** — Dashboard → **Authentication → URL Configuration** →
   Site URL `http://127.0.0.1:4291`, and add redirect `http://127.0.0.1:4291/web/index.html`.
2. **Run + sign in:** `python -m http.server 4291 --bind 127.0.0.1` → open
   `http://127.0.0.1:4291/web/index.html` → magic-link in with your email.
3. **Get a commander role** — tell me you've signed in (with which email) and I'll set it, or run the
   SQL in step 9 below yourself.

Then **New callout → Authorise → Seal → Verify record** works end-to-end. Parts B/C add the live feed
and telemetry. (The CLI steps below are the manual equivalent, kept for reference.)

---

## Part A — Backend + console (the essential path, ~20 min)

### 1. Create the Supabase project
[app.supabase.com](https://app.supabase.com) → **New project**:
- Name `warden-dfr`, **Region: London (eu-west-2)** (UK data residency), set a DB password (save it).
- Wait for it to finish provisioning.

### 2. Install the Supabase CLI (skip if you have it)
```bash
npm install -g supabase
supabase --version
```

### 3. Apply the schema
From **Git Bash** in the repo:
```bash
cd "C:/Users/joedr/Downloads/APPS/WARDEN-DFR"
supabase login
supabase link --project-ref <your-project-ref>     # ref = the subdomain in your project URL
supabase db push                                     # applies migrations/0001_init.sql
```
*(No-CLI fallback for just the schema: open the dashboard **SQL Editor**, paste the whole of
`supabase/migrations/0001_init.sql`, run it. You'll still use the CLI for step 5.)*

### 4. Set the ledger signing secret (server-only — never shipped to the browser)
```bash
supabase secrets set LEDGER_SECRET=$(openssl rand -hex 32)
```
PowerShell alternative:
```powershell
$s = -join ((1..32) | % { '{0:x2}' -f (Get-Random -Max 256) }); supabase secrets set LEDGER_SECRET=$s
```

### 5. Deploy the edge functions
```bash
supabase functions deploy incident-open ledger-append ledger-verify
```

### 6. Allow the magic-link redirect
Dashboard → **Authentication → URL Configuration**:
- **Site URL:** `http://127.0.0.1:4291`
- **Redirect URLs:** add `http://127.0.0.1:4291/web/index.html`

### 7. Wire the console
Dashboard → **Project Settings → API**. Copy **Project URL** and the **anon public** key into the
`CONFIG` block at the top of `web/index.html`:
```js
const CONFIG = {
  SUPABASE_URL:      'https://<ref>.supabase.co',
  SUPABASE_ANON_KEY: '<anon public key>',
  FEED_WHEP:         'http://localhost:8889/thermal/whep',  // leave for Part B
  TELEMETRY_WS:      'ws://localhost:8090',                 // leave for Part C
};
```
The anon key is meant to be public — RLS + the server-only `LEDGER_SECRET` are what protect you.

### 8. Run it & sign in
```bash
cd "C:/Users/joedr/Downloads/APPS/WARDEN-DFR"
python -m http.server 4291 --bind 127.0.0.1
```
Open `http://127.0.0.1:4291/web/index.html`, enter your email, click the magic link.

### 9. Make yourself a commander
You'll sign in as `viewer` by default. Dashboard → **SQL Editor** (use your real email):
```sql
update profiles
set role = 'commander', full_name = 'J. Chapman'
where id = (select id from auth.users where email = 'you@example.com');
```
*(Use the email lookup — `auth.uid()` is null in the SQL editor.)* Reload the console.

### ✅ You can now prove the product
**New callout → Authorise flight → Flag hazard → Seal & close → Verify record.** Every action is
written server-side and HMAC-signed. To see the tamper-evidence for real: in the SQL editor the
ledger is append-only (an `UPDATE` is *rejected* by a trigger) — that rejection **is** the proof.

---

## Part B — live thermal feed (optional)
Prove real pixels through the pipe (see `relay/README.md`):
```bash
# download MediaMTX, run it, then push a test feed:
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=25 -vf format=gray \
  -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://localhost:8554/thermal
```
Set `CONFIG.FEED_WHEP = 'http://localhost:8889/thermal/whep'`, reload, **Connect feed**.

## Part C — telemetry (optional)
See `telemetry/README.md`: run ArduPilot SITL + mavlink2rest + the bridge, then **Connect
telemetry**. Arm/takeoff in SITL → ALT/BATT/SPD/MODE go live and a `DRONE AIRBORNE` event lands on
the ledger.

---

## Common snags
- **Magic link does nothing** → the redirect URL isn't allow-listed (step 6), or check spam.
- **`forbidden: commander required`** → you didn't run step 9, or used the wrong email.
- **Edge function 401/500** → `supabase secrets set LEDGER_SECRET=...` wasn't run, or functions
  weren't deployed.
- **`db push` auth error** → re-run `supabase login` and confirm the `--project-ref`.
