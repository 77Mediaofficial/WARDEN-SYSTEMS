# WARDEN · Vigil — DFR platform (Milestone 1)

The **real** software layer behind the WARDEN Fire & Rescue concept. This turns the
[`dfr.html`](https://warden-five-tau.vercel.app/dfr.html) *simulation* into a working product:
a governed backend that ingests a **real thermal feed** and holds a **real, server-signed,
tamper-evident audit record**.

> **What this is / is not.** This is the **command + accountability software** — the layer a
> fire & rescue service and a licensed drone operator plug into. It is **not** the drone, the
> Drone-in-a-Box dock, the flying, or the CAA Operational Authorisation — those are bought
> off-the-shelf and flown by a **partner operator**. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Milestone 1 — "Real thermal, real record"
A thin but genuine vertical slice you can build and demo with **no drone and no budget**:

1. **Governed backend (Supabase, UK region)** — RBAC (commander / operator / viewer / admin),
   an **append-only, HMAC-signed, hash-chained** `overwatch_events` ledger, incidents, an
   access log, and retention (auto-purge of media past its window, ledger preserved).
2. **A real thermal feed** — an off-the-shelf **MediaMTX** gateway relays an RTSP stream from
   *any* thermal camera → **WebRTC** into the console. See [relay/README.md](relay/README.md).
   (Free. No drone needed — a sub-£300 thermal cam, or ArduPilot SITL for telemetry, proves the path.)
3. **The live console** (`web/index.html`) — Supabase magic-link auth, real incidents, live
   thermal `<video>`, and the ledger written **server-side** on every action (authorise / flag /
   seal) so it cannot be forged in the browser.

Why it matters: the browser sim's hashes were client-side (impressive, but fakeable). Here the
chain is **signed by a server secret the client never sees** — genuine tamper-evidence, and the
thing a DPO/CFO actually needs to see.

## Repo layout
```
supabase/
  migrations/0001_init.sql        RBAC + incidents + append-only ledger + access log + retention (FORCE RLS)
  functions/
    _shared/hash.ts               SHA-256 + HMAC + deterministic canonical serialisation
    incident-open/                open an incident + write the first ledger event (atomic)
    ledger-append/                append a signed, hash-chained event (server-mediated, role-checked)
    ledger-verify/                recompute the whole chain, return sealed | broken-at
web/index.html                    the live operating-picture console
relay/README.md                   run the free RTSP→WebRTC gateway for a real thermal cam
```

## Your setup (owner-run — I do not touch your databases)
Prereqs: [Supabase CLI](https://supabase.com/docs/guides/cli), a UK-region Supabase project.

```bash
# 1. create/link the project (choose London / eu-west-2 region in the dashboard)
supabase login
supabase link --project-ref <your-new-warden-dfr-ref>

# 2. apply the schema
supabase db push                       # applies migrations/0001_init.sql

# 3. set the ledger signing secret (NEVER shipped to the client)
supabase secrets set LEDGER_SECRET="$(openssl rand -hex 32)"

# 4. deploy the edge functions
supabase functions deploy incident-open ledger-append ledger-verify

# 5. (dashboard, once) SQL editor: enable hourly retention
#    select cron.schedule('warden-retention','0 * * * *', $$ select enforce_retention(); $$);

# 6. make yourself a commander (SQL editor, after you sign in once via the console)
#    update profiles set role='commander', full_name='Watch Mgr. J. Chapman' where id = auth.uid();
```
Then drop your project URL + anon key into `web/index.html` (marked `CONFIG`), run the relay,
and open the console.

## Honest status
- ✅ Real, correct backend design (append-only, signed chain, FORCE RLS, retention).
- ✅ Real feed path via a commodity gateway (buy the transport, build the layer).
- ⏳ Autonomy (auto-launch before the crew) is **not** here and is years + partners away — day one
  is **human-supervised, pre-positioned**. Don't sell what can't be flown.
- ⏳ Real drone SDK telemetry (MAVLink/DJI) is Milestone 2; ArduPilot SITL simulates it for free now.
