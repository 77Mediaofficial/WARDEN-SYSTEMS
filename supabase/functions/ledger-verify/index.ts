// ledger-verify — recompute an incident's whole chain and report the first break. Self-contained.
// Recomputes content_hash from stored fields AND the HMAC chain_hash, so it detects a doctored
// field, a re-linked/inserted/deleted event, or an invalid signature. Any roled user may verify.
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

    const { incidentId } = (await req.json()) ?? {};
    if (!incidentId) return json({ error: "incidentId required" }, 400);

    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const secret = await ledgerSecret(db);
    const { data: events } = await db.from("overwatch_events")
      .select("seq, ts, event, meta, actor, gate, content_hash, prev_hash, chain_hash")
      .eq("incident_id", incidentId).order("seq", { ascending: true });

    let prev = GENESIS;
    let brokenAt: number | null = null;
    const reasons: Record<number, string> = {};
    for (const e of events ?? []) {
      const content = await sha256Hex(canonical(e));
      const expectChain = await hmacHex(secret, `${prev}::${content}`);
      if (content !== e.content_hash) { brokenAt = e.seq; reasons[e.seq] = "content altered"; break; }
      if (e.prev_hash !== prev) { brokenAt = e.seq; reasons[e.seq] = "chain re-linked"; break; }
      if (expectChain !== e.chain_hash) { brokenAt = e.seq; reasons[e.seq] = "signature invalid"; break; }
      prev = e.chain_hash;
    }

    return json({ sealed: brokenAt === null, brokenAt, reason: brokenAt ? reasons[brokenAt] : null, count: events?.length ?? 0 });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
