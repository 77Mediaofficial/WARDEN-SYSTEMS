// incident-open — create an incident + write its genesis ledger event (atomic). Self-contained.
// commander/admin only. Returns { incident, event }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
function stable(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  const o = v as Record<string, unknown>;
  return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + stable(o[k])).join(",") + "}";
}
const canonical = (e: any) => stable({ seq: e.seq, ts: e.ts, event: e.event, meta: e.meta, actor: e.actor, gate: e.gate });
const sha256Hex = async (s: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
async function hmacHex(secret: string, s: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(s)));
}
const GENESIS = "VIGIL::GENESIS";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

let SECRET: string | null = null;
async function ledgerSecret(db: any): Promise<string> {
  if (SECRET) return SECRET;
  const { data, error } = await db.from("app_secrets").select("value").eq("key", "ledger_secret").single();
  if (error || !data) throw new Error("ledger secret not initialised");
  return (SECRET = data.value);
}

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
    const secret = await ledgerSecret(db);

    const { data: seqRow, error: seqErr } = await db.rpc("nextval_incident_ref");
    let ref: string;
    if (seqErr) {
      const { count } = await db.from("incidents").select("*", { count: "exact", head: true });
      ref = "INC-" + (4090 + (count ?? 0));
    } else ref = "INC-" + seqRow;

    const { data: incident, error: iErr } = await db.from("incidents").insert({
      ref, type, location, status: "open", opened_by: user.id, retention_days,
    }).select().single();
    if (iErr) return json({ error: iErr.message }, 400);

    const ts = new Date().toISOString();
    const actor = `${role.toUpperCase()} · ${profile?.full_name ?? user.email ?? "unknown"}`;
    const meta = { type, location: location ?? "—", lawful_basis: "public_task" };
    const contentHash = await sha256Hex(canonical({ seq: 1, ts, event: "INCIDENT OPENED", meta, actor, gate: false }));
    const chainHash = await hmacHex(secret, `${GENESIS}::${contentHash}`);

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
