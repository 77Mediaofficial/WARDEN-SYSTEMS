# WARDEN × Evolve Dynamics — Integration Sketch
*How the governance layer plugs in downstream of your aircraft*

> Partner-facing technical brief for a first scoping call. Status: **draft for discussion.**
> WARDEN = the command + accountability software layer. Not the airframe, the datalink, or the flying.

## The boundary, up front
WARDEN sits **downstream** of your ground station. We consume the video and telemetry your
system already produces; we never touch the airframe, the Mesh Rider datalink, or flight
control. Your lane ends at the GCS output. Ours begins there.

```text
  AIRCRAFT            YOUR SIDE (the air)                 WARDEN (the governance)
 ┌─────────┐   Doodle Labs   ┌──────────────┐
 │  Sky    │   Mesh Rider    │  Sky Mantis  │  ① video   ┌──────────────┐
 │ Mantis 2│══════datalink══▶│  ground      │──RTSP────▶ │  MediaMTX    │─WHEP─┐
 │ thermal │  HD+thermal+    │  station /   │            │ (off-the-    │      │
 │ + tlm   │  telem + C2     │  GCS         │  ② telem   │  shelf relay)│      ▼
 └─────────┘  on one link    │              │──MAVLink─▶ │  normaliser  │  ┌────────────┐
                             └──────────────┘   / SDK    └──────────────┘  │  WARDEN    │
                                     │                                     │  console   │
                                     │              ③ authorisation ─────▶ │  + ledger  │
                                     │              (in console, NOT to    └────────────┘
                                     ▼               the aircraft)                │
                              flight execution                          server-signed (HMAC)
                              stays 100% in your GCS                    append-only record
```

## ① Video — thermal into the operating picture
Your GCS emits the thermal stream (optionally HD alongside); an off-the-shelf **MediaMTX**
gateway relays it RTSP→**WebRTC/WHEP** into the console's `<video>`. Low-latency on a LAN.
We buy the transport, we don't rebuild your downlink.
*Confirm on the call: what the Sky Mantis 2 GCS exposes — RTSP, ONVIF, or SDK.*

## ② Telemetry — flight state becomes record
Position, altitude, battery and mode arrive over **MAVLink** (or your SDK); a thin normaliser
feeds the console, and defined transitions become **governed ledger events** — e.g. a
`DRONE AIRBORNE` entry written on first arm during an open incident.
*Confirm: telemetry protocol and field set.*

## ③ Command — we don't fly your drone
This is the important one. WARDEN records **human authorisation** ("commander authorised this
flight at 14:32") — it does **not** send commands to the aircraft. Flight execution stays
entirely in your GCS, under your remote pilot in command. We make the *decision* accountable;
you keep the *control*. That's what keeps "human in command" true and our lanes clean.

## What lands on the record
Every authorisation, hazard flag, airborne event and seal is written to an append-only,
**HMAC-SHA256** hash-chained ledger — server-signed with a key the client never sees, so it
can't be forged after the fact. Incident imagery auto-purges on a retention clock; the audit
record persists. Accountability without hoarding personal data.

## The lanes
| Your side (the air) | WARDEN (the governance) |
|---|---|
| Airframe, Mesh Rider datalink, thermal payload | The governed operating-picture console |
| CAA Operational Authorisation, BVLOS, SORA | The tamper-evident, server-signed record |
| Remote pilot in command, flight execution | Role-based human authorisation + audit |

Two invoices, one procurable package for the FRS.

## Three questions for the call
*(so we can scope, not hand-wave)*
1. What does the Sky Mantis 2 GCS expose for video out — RTSP / ONVIF / SDK?
2. Telemetry: MAVLink, or your own SDK — and what's the field set?
3. For an FRS deployment, on-prem or their cloud tenant? (Drives the data-residency story.)
