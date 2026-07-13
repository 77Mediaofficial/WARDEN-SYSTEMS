// Shared cryptographic helpers for the tamper-evident ledger.
// Deterministic canonical serialisation → SHA-256 content hash → HMAC-SHA-256 chain hash.

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Stable JSON: object keys sorted recursively, so jsonb round-trips hash identically. */
export function stable(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  const o = v as Record<string, unknown>;
  return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + stable(o[k])).join(",") + "}";
}

export interface LedgerPayload {
  seq: number;
  ts: string;
  event: string;
  meta: unknown;
  actor: string;
  gate: boolean;
}

/** The exact bytes that get hashed for content integrity. */
export function canonical(e: LedgerPayload): string {
  return stable({ seq: e.seq, ts: e.ts, event: e.event, meta: e.meta, actor: e.actor, gate: e.gate });
}

export async function sha256Hex(s: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

/** Chain hash — signed with the server-only LEDGER_SECRET so clients cannot forge it. */
export async function hmacSha256Hex(secret: string, s: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(s)));
}

export const GENESIS = "VIGIL::GENESIS";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
