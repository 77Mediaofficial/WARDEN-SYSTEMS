# Milestone 3 — the partner + pilot plan

Software and simulators prove the *layer*. A pilot proves the *product*. This is how WARDEN gets
from a working console to a real fire & rescue service flying it — without WARDEN owning a drone or
holding an aviation licence.

> **Honest framing.** This is a plan, not a done deal. It needs two partners WARDEN does not yet
> have (a drone operator and a fire service) and a DPIA WARDEN cannot sign alone. The software is
> the easy part; the relationships are the work.

## 1. The three parties (and who does what)
| Party | Brings | WARDEN is **not** this |
|---|---|---|
| **Fire & Rescue Service** (the customer) | The operational need, the incident context, the **DPIA lead** (their DPO), the airspace/scene authority | — |
| **Drone operator** (the partner) | The airframe + thermal payload, the **CAA Operational Authorisation** (BVLOS), pilots, aviation insurance | — |
| **WARDEN / Vigil** (you) | The operating picture, the tamper-evident governed record, the retention/disclosure engine, the DPIA *content* | the aircraft, the pilot, the licence |

You sit in the middle and make the other two able to work together lawfully. That's the whole pitch.

## 2. Who to approach
- **Fire side:** an FRS **innovation / transformation / digital lead**, or a **drone (UAS) unit
  manager** — most FRSs already run a drone team, flown manually and reactively. The **National
  Fire Chiefs Council (NFCC)** has a drones/UAS working group; a warm intro there is worth ten cold
  emails. Start with the service where you already have a contact (Surrey).
- **Operator side:** a UK drone company that already holds a BVLOS **Operational Authorisation** and
  does public-safety / emergency work. You're offering them the *software + governance* they don't
  build — a reason to bid jointly for FRS work. Approach 2–3; you only need one.

## 3. What a fire-service DFR pilot actually looks like (phased — de-risks everyone)
1. **Tabletop (week 0):** a 30–45 min session driving the live console with **synthetic data**.
   No aircraft, no data, no risk. Goal: the FRS says "yes, this is useful," the DPO says "I can see
   how this gets signed off."
2. **Co-written DPIA (weeks 1–4):** the FRS DPO leads; WARDEN supplies the governance content
   (lawful basis, retention, no-FR, access controls — already mapped in `ARCHITECTURE.md`). This is
   the real gate. No DPIA, no flight.
3. **Supervised trial (training ground):** the operator flies a thermal drone on an FRS training
   site (no public), WARDEN records the governed session. Proves the *whole* path with real pixels.
4. **Live-incident shadow (record-only):** at real incidents, human-supervised, pre-positioned —
   overwatch runs alongside the normal response, WARDEN keeps the record. This is the honest
   day-one deployment; it is **not** autonomous auto-launch.
5. **Operational pilot:** a defined number of stations / months, measured against agreed outcomes
   (time-to-picture, decisions informed, DPIA adherence). This is your reference case.

## 4. The regulatory / assurance reality (know it cold)
- **CAA Operational Authorisation** for BVLOS is held by the **operator**, not you. Don't imply you
  hold it. ([UK CAA CAP 722](https://www.caa.co.uk/) is the reference.)
- **DPIA** is mandatory for systematic monitoring of a public place (UK GDPR Art 35); **FRS-led**,
  WARDEN-assisted.
- **Insurance** (aviation + PI) sits with the operator; WARDEN carries software PI/cyber cover.
- **Airspace & scene safety** are the FRS/operator's; WARDEN's job stops at the software boundary.

## 5. The ask (what you actually request — small, then bigger)
1. *"30 minutes to show you the console and get your brutal feedback."* (Surrey email — already drafted.)
2. If useful: *"Let me sit with your DPO for an hour to map the DPIA against what's already built in."*
3. If that lands: *"Introduce me to a drone operator you'd trust, and let's design a tabletop."*

Each ask is cheap for them to say yes to. You are never asking them to buy — you're asking them to
look, then to help you shape it.

## 6. How you get paid (the layer, not the aircraft)
- **Pilot:** free or at-cost — the goal is the **reference**, not revenue.
- **Then:** a per-service (or per-station) **SaaS licence** for the Vigil platform — command picture,
  governed record, retention/disclosure, support. The operator charges for flying; you charge for
  the software + assurance. Two separate lines on the invoice.
- **Leverage:** the governed, DPO-signed record is the moat — it's what makes *any* operator's drone
  procurable by a public body. You make everyone else's hardware worth more.

## 7. Funding (honest — fire is thinner than health)
- **Not** DASA (defence — dropped) and **not** SBRI *Healthcare* (that's NHS). For fire, look at
  **Home Office / NFCC innovation** routes, **UKRI / Innovate UK** open competitions, and
  operator-led bids where WARDEN is the named software partner.
- Realistically the fastest capital-light path is: **land a reference pilot → licence revenue**,
  co-selling with the drone operator, rather than chasing a fire-specific grant that may not exist.

## 8. Risks & honest gates
- No FRS partner yet → the Surrey outreach is literally step one; nothing moves without it.
- No operator partner yet → needed before any real flight.
- Autonomy (auto-launch before the crew) is a **later** safety-case milestone, not the pilot. Sell
  human-in-command, pre-positioned overwatch — the thing that's actually flyable today.
- Procurement cycles in the public sector are slow; a free tabletop + a co-written DPIA is how you
  keep momentum while the paperwork catches up.

---
**Immediate next actions:** (1) send the Surrey email; (2) list 2–3 UK BVLOS operators to approach;
(3) when Surrey replies, book the tabletop using the live console. The software is ready to show the
moment you have a room.
