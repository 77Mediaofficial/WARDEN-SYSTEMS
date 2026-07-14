// ledger-append — append one signed, hash-chained event. Self-contained (deployed via MCP).
// operator/commander/admin may write; gate (human-authorise) steps require commander/admin.
// The HMAC signing secret is read from the app_secrets DB row (never env/client), so a client
// cannot forge the chain.
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
    const secret = await ledgerSecret(db);

    const { data: prev } = await db.from("overwatch_events")
      .select("seq, chain_hash").eq("incident_id", incidentId)
      .order("seq", { ascending: false }).limit(1).maybeSingle();

    const seq = (prev?.seq ?? 0) + 1;
    const prevChain = prev?.chain_hash ?? GENESIS;
    const ts = new Date().toISOString();
    const actor = `${role.toUpperCase()} · ${profile?.full_name ?? user.email ?? "unknown"}`;
    const contentHash = await sha256Hex(canonical({ seq, ts, event, meta, actor, gate }));
    const chainHash = await hmacHex(secret, `${prevChain}::${contentHash}`);

    const { data: row, error: iErr } = await db.from("overwatch_events").insert({
      incident_id: incidentId, seq, ts, event, meta, actor, actor_id: user.id, gate,
      content_hash: contentHash, prev_hash: prevChain, chain_hash: chainHash,
    }).select().single();
    if (iErr) return json({ error: iErr.message }, 400);

    if (sealsIncident) {
      const until = new Date(Date.now() + 31 * 864e5).toISOString();
      await db.from("incidents").update({ status: "sealed", sealed_at: ts, retention_until: until }).eq("id", incidentId);
    }
    return json({ ok: true, event: row });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
