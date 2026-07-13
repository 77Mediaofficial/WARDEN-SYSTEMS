# Architecture & the real/partner boundary

## The two systems (only one is ours)
| System | Owner | What |
|---|---|---|
| **Aircraft** | Partner (licensed operator) | Drone, thermal payload, Drone-in-a-Box dock, the flying, the **CAA Operational Authorisation** (BVLOS). Bought & flown, not built by us. |
| **Command + accountability** | **WARDEN / Vigil (us)** | Operating picture, feed relay, telemetry ingest, the **governed tamper-evident record**, retention, disclosure. The layer everyone plugs into. |

We build the layer and sell/licence it. We never touch the airframe or hold the OA.

## Data path (Milestone 1)
```
 thermal camera (RTSP)                    drone SDK / ArduPilot SITL (Milestone 2)
        │                                          │  MAVLink/MQTT telemetry
        ▼                                          ▼
   MediaMTX gateway  ── WebRTC/WHEP ──►   ┌──────────────────────────┐
   (off-the-shelf)                        │  web/index.html (console) │
                                          │  Supabase Auth (roles)    │
                                          └────────────┬─────────────┘
                                                       │ authorise / flag / seal
                                                       ▼
                                          Supabase Edge Functions (Deno)
                                          incident-open · ledger-append · ledger-verify
                                                       │ HMAC-signed hash chain
                                                       ▼
                                          Postgres (FORCE RLS)
                                          incidents · overwatch_events (append-only) · access_log
                                                       │ hourly pg_cron
                                                       ▼
                                          enforce_retention()  (purge media, keep the record)
```

## Why the ledger is genuinely tamper-evident (not the browser sim)
- Each event stores `content_hash = SHA-256(canonical(event))` and
  `chain_hash = HMAC-SHA-256(LEDGER_SECRET, prev_chain || content_hash)`.
- `LEDGER_SECRET` lives **only** in the edge-function environment — the browser and the anon key
  never see it, so a client cannot forge a valid chain.
- `overwatch_events` is **append-only**: `UPDATE`/`DELETE` are blocked by triggers, and no RLS
  insert policy exists for clients — appends happen **only** through the role-checked edge function.
- `ledger-verify` recomputes the whole chain and returns the first `seq` where it breaks.
- Retention deletes **media**, never the audit record — and writes a `MEDIA PURGED` event, so the
  deletion itself is on the record.

## UK data-protection mapping (built in, DPO-signed at deployment)
| Control | Where |
|---|---|
| **Lawful basis** — public task (UK GDPR 6(1)(e)); 9(2)(c) for any health signal | `incidents.lawful_basis`; scoped to firefighting/scene-safety |
| **No facial recognition** | No biometric model exists in the stack; not a dependency, cannot be toggled on |
| **Storage limitation** (5(1)(e)) | `incidents.retention_until` + `enforce_retention()` auto-purge |
| **Accountability** (5(2)) | `overwatch_events` (who/what/why/when) + `access_log` (who viewed) |
| **Overt, incident-linked only** | Events are always bound to an `incident_id`; no free-flying capture |
| **Security by design** | FORCE RLS, server-held signing secret, UK data residency, role-based access |

This is design intent; a real deployment finalises it with the service's DPO under a full DPIA.
