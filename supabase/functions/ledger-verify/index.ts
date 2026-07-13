// ledger-verify — recompute an incident's entire chain and report the first break.
// Recomputes content_hash from the stored fields AND the HMAC chain_hash, so it detects both
// a doctored field and a broken/re-ordered/inserted link. Auth: any roled user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { canonical, sha256Hex, hmacSha256Hex, GENESIS, CORS, json } from "../_shared/hash.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LEDGER_SECRET = Deno.env.get("LEDGER_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "unauthenticated" }, 401);

    const { incidentId } = (await req.json()) ?? {};
    if (!incidentId) return json({ error: "incidentId required" }, 400);

    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: events } = await db.from("overwatch_events")
      .select("seq, ts, event, meta, actor, gate, content_hash, prev_hash, chain_hash")
      .eq("incident_id", incidentId).order("seq", { ascending: true });

    let prev = GENESIS;
    let brokenAt: number | null = null;
    const reasons: Record<number, string> = {};
    for (const e of events ?? []) {
      const content = await sha256Hex(canonical(e));
      const expectChain = await hmacSha256Hex(LEDGER_SECRET, `${prev}::${content}`);
      if (content !== e.content_hash) { brokenAt = e.seq; reasons[e.seq] = "content altered"; break; }
      if (e.prev_hash !== prev) { brokenAt = e.seq; reasons[e.seq] = "chain re-linked"; break; }
      if (expectChain !== e.chain_hash) { brokenAt = e.seq; reasons[e.seq] = "signature invalid"; break; }
      prev = e.chain_hash;
    }

    return json({
      sealed: brokenAt === null,
      brokenAt,
      reason: brokenAt ? reasons[brokenAt] : null,
      count: events?.length ?? 0,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
