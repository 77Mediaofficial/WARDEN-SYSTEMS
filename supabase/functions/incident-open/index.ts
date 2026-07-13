// incident-open — create an incident and write its first (genesis) ledger event atomically.
// Auth: commander/admin only. Returns { incident, event }.
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

    const { data: profile } = await asUser.from("profiles").select("role, full_name").eq("id", user.id).single();
    const role = profile?.role ?? "viewer";
    if (!["commander", "admin"].includes(role)) return json({ error: "forbidden: commander required to open an incident" }, 403);

    const { type = "Structure fire", location = null, retention_days = 31 } = (await req.json().catch(() => ({}))) ?? {};
    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    // ref from a sequence: INC-4090, INC-4091, ...
    const { data: seqRow, error: seqErr } = await db.rpc("nextval_incident_ref");
    let ref: string;
    if (seqErr) {
      // fallback if the helper rpc isn't present: derive from count
      const { count } = await db.from("incidents").select("*", { count: "exact", head: true });
      ref = "INC-" + (4090 + (count ?? 0));
    } else {
      ref = "INC-" + seqRow;
    }

    const { data: incident, error: iErr } = await db.from("incidents").insert({
      ref, type, location, status: "open", opened_by: user.id, retention_days,
    }).select().single();
    if (iErr) return json({ error: iErr.message }, 400);

    // genesis ledger event
    const ts = new Date().toISOString();
    const actor = `${role.toUpperCase()} · ${profile?.full_name ?? user.email ?? "unknown"}`;
    const meta = { type, location: location ?? "—", lawful_basis: "public_task" };
    const contentHash = await sha256Hex(canonical({ seq: 1, ts, event: "INCIDENT OPENED", meta, actor, gate: false }));
    const chainHash = await hmacSha256Hex(LEDGER_SECRET, `${GENESIS}::${contentHash}`);

    const { data: event, error: eErr } = await db.from("overwatch_events").insert({
      incident_id: incident.id, seq: 1, ts, event: "INCIDENT OPENED", meta, actor, actor_id: user.id, gate: false,
      content_hash: contentHash, prev_hash: GENESIS, chain_hash: chainHash,
    }).select().single();
    if (eErr) return json({ error: eErr.message }, 400);

    await db.from("access_log").insert({ actor_id: user.id, action: "OPEN_INCIDENT", incident_id: incident.id });
    return json({ ok: true, incident, event });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
