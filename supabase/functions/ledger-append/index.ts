// ledger-append — append one signed, hash-chained event to an incident's overwatch ledger.
// Auth: operator/commander/admin may write; gate (human-authorise) steps require commander/admin.
// The chain is HMAC-signed with LEDGER_SECRET (server-only) so a client cannot forge it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { canonical, sha256Hex, hmacSha256Hex, GENESIS, CORS, json } from "../_shared/hash.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LEDGER_SECRET = Deno.env.get("LEDGER_SECRET")!;

const WRITERS = ["operator", "commander", "admin"];
const GATERS = ["commander", "admin"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "unauthenticated" }, 401);

    const { data: profile } = await asUser.from("profiles").select("role, full_name").eq("id", user.id).single();
    const role = profile?.role ?? "viewer";

    const { incidentId, event, meta = {}, gate = false, sealsIncident = false } = (await req.json()) ?? {};
    if (!incidentId || !event) return json({ error: "incidentId and event required" }, 400);
    if (!WRITERS.includes(role)) return json({ error: "forbidden: no write role" }, 403);
    if (gate && !GATERS.includes(role)) return json({ error: "forbidden: authorise requires commander" }, 403);

    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    // previous chain hash (append is serialised by the unique(incident_id, seq) constraint)
    const { data: prev } = await db.from("overwatch_events")
      .select("seq, chain_hash").eq("incident_id", incidentId)
      .order("seq", { ascending: false }).limit(1).maybeSingle();

    const seq = (prev?.seq ?? 0) + 1;
    const prevChain = prev?.chain_hash ?? GENESIS;
    const ts = new Date().toISOString();
    const actor = `${role.toUpperCase()} · ${profile?.full_name ?? user.email ?? "unknown"}`;

    const contentHash = await sha256Hex(canonical({ seq, ts, event, meta, actor, gate }));
    const chainHash = await hmacSha256Hex(LEDGER_SECRET, `${prevChain}::${contentHash}`);

    const { data: row, error: iErr } = await db.from("overwatch_events").insert({
      incident_id: incidentId, seq, ts, event, meta, actor, actor_id: user.id, gate,
      content_hash: contentHash, prev_hash: prevChain, chain_hash: chainHash,
    }).select().single();
    if (iErr) return json({ error: iErr.message }, 400); // unique(seq) violation ⇒ concurrent append, caller retries

    // optional lifecycle side-effects on the (mutable) incident row
    if (sealsIncident) {
      const until = new Date(Date.now() + 31 * 864e5).toISOString();
      await db.from("incidents").update({ status: "sealed", sealed_at: ts, retention_until: until }).eq("id", incidentId);
    }
    return json({ ok: true, event: row });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
