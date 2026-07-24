# WARDEN — Evolve Dynamics call prep (objection map)

Internal prep for the first Evolve Dynamics call — **Mike Dewhirst, Founder /
Principal Engineering Advisor** (do **not** call him "CEO"). Five questions he is
likely to test WARDEN with, and the honest, trap-avoiding answer to each.

**Through-line:** win on **neutrality** and **honesty**, not on claiming the tech is
uncrackable or the traction is bigger than it is. Every answer should make him feel
WARDEN is the low-risk, easy partner — not the desperate one.

## 1. "Why wouldn't we just build this governance layer ourselves?"
**Trap:** getting defensive, or implying he can't. His team could build the hash chain
in a weekend; arguing technical difficulty loses.

**Answer:** "You absolutely could build the mechanism — it's not hard. The question is
whether it's the best use of your engineers, and whether you'd want to. Two reasons I'd
say no. First, neutrality: an information-governance committee trusts an audit layer more
when it's independent of the aircraft vendor — you don't want to be the operator who also
grades your own homework on the record meant to hold you accountable. That independence is
worth more to the fire service than the code is. Second, it's a standing commitment, not a
feature — living inside UK DPIA practice, the Data (Use and Access) Act, RIPA, and shifting
CAA and data-residency expectations, and keeping the posture current as the law moves. Every
hour your team spends maintaining DPIA templates is an hour not spent on the airframe and the
autonomy. I carry the governance so you can carry the flight."

## 2. "What's the commercial model, concretely?"
**Trap:** improvising a number you can't stand behind, or sounding like you want a slice of
his revenue.

**Answer:** "Clean, separate lanes — I never touch your margin. You invoice the fire service
for flight operations, hardware and maintenance, exactly as you do today. WARDEN licenses the
command-and-accountability software to the fire service directly — annual SaaS, tiered by
scale, plus a one-off onboarding fee for the first integration. I don't take a cut of your
flight revenue and I don't resell your hardware. In a joint bid we're two clean line items to
the buyer. I'm deliberately not quoting a final per-seat figure yet, because that should be
calibrated against the first reference pilot — but the shape is fixed and the lanes never
overlap."

## 3. "Who else are you talking to?"
**Trap:** bluffing a pipeline (he'll smell it), or letting "no one yet" sound like a deficit.

**Answer:** "You're the first operator I've approached — on purpose. Beyond the Innovate UK
alignment, we're right down the road from each other. Building this first integration properly
needs a tight engineering loop, and I wanted a local partner where we can sit in the same room
if we need to, rather than shopping the idea around remotely. You're not being played off
anyone."

**Honesty guardrail:** do not claim fire-service conversations you don't have. "You're first,
deliberately, and local" is true and strong; an invented pipeline is the one lie that ends the
relationship.

## 4. "Is thermal-at-incident-scenes actually GDPR-defensible?"
**Trap:** buzzwords without substance; never say "fully compliant."

**Answer:** "Lawful basis is public task under Article 6(1)(e) — the fire service's statutory
function — and vital interests, 6(1)(d), where life's at risk. Where casualty location touches
special-category data you lean on 9(2)(c), and you minimise hard: no facial recognition, no
biometric identification, coarse location, a retention clock that auto-purges imagery while the
audit record persists. It's overt, at a declared incident, directed at the hazard not at
persons — which keeps you clear of RIPA directed-surveillance territory — and it's written to
the Data (Use and Access) Act, not the old camera code. But I won't tell you it's
'GDPR-solved.' A DPIA is a living document the fire service owns. What WARDEN does is hand that
DPIA its strongest possible starting point and an audit trail that evidences proportionality —
so the DPO's job is sign-off, not archaeology."

## 5. "You're pre-revenue — what's the real maturity, who's your customer?"
**Trap:** deflating the room, or bluffing a customer.

**Answer:** "I'm pre-pilot and honest about it — but what exists is real, not vapour. There's a
working backend with an append-only, server-signed ledger you can try to tamper with and watch
the database reject the write; a live console; and a defined path to integrate an aircraft like
yours. What I don't have is a signed fire service or a flown pilot — and that's exactly why I'm
here. A fire service's first question is 'who flies it and does it work,' and a credible
operator answers half of that. I'm not asking you to bet on a finished product. I'm asking: if
a fire service wants a governed DFR trial, would you fly it with my layer as the record?
Architecture's done, governance is real, the pilot's the next domino."

## Live-call mechanics (not for the deck)
- **Ask his version back.** After Q1 and Q4, turn it into a question — "does the IG gap
  actually cost you deals?" — and let him talk. Shifts the room from pitch to peer conversation.
- **The tamper demo is the mic-drop for Q5.** On a screen-share, show the database rejecting
  the UPDATE. Five seconds beats every paragraph.
