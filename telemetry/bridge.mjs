// WARDEN · Vigil — telemetry bridge (Milestone 2)
// Consumes MAVLink (via mavlink2rest's JSON WebSocket), normalises it, and re-serves a clean
// telemetry object to the console over a WebSocket. No real drone needed: ArduPilot SITL emits
// genuine MAVLink for free. This is dumb, unauthenticated TRANSPORT — the authed console decides
// what (if anything) gets written to the governed ledger.
//
//   ArduPilot SITL ──MAVLink──► mavlink2rest (ws :8088) ──► bridge.mjs ──ws :8090──► console
//
// Run:  npm install && MAVLINK2REST_WS=ws://127.0.0.1:8088/v1/ws/mavlink npm start
import { WebSocket, WebSocketServer } from "ws";

const SRC = process.env.MAVLINK2REST_WS || "ws://127.0.0.1:8088/v1/ws/mavlink";
const PORT = Number(process.env.PORT || 8090);

const state = {
  type: "telemetry", link: "offline", ts: null,
  lat: null, lon: null, altM: null, hdg: null,
  battPct: null, voltage: null, groundspeed: null, mode: null, armed: false,
};

const wss = new WebSocketServer({ port: PORT });
wss.on("connection", (ws) => ws.send(JSON.stringify(state)));
function broadcast() {
  const msg = JSON.stringify(state);
  for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
}
let last = 0;
function tick() { const now = Date.now(); if (now - last > 200) { last = now; state.ts = new Date().toISOString(); broadcast(); } } // ~5 Hz

const MODES = { 0: "STABILIZE", 2: "ALT_HOLD", 3: "AUTO", 4: "GUIDED", 5: "LOITER", 6: "RTL", 9: "LAND", 16: "POSHOLD" };
const num = (v) => (v && typeof v === "object" && "bits" in v ? v.bits : v) ?? 0; // mavlink2rest sometimes wraps flags as {bits}

function connect() {
  const src = new WebSocket(SRC);
  src.on("open", () => { state.link = "live"; console.log("[bridge] connected to", SRC); });
  src.on("close", () => { state.link = "offline"; tick(); console.log("[bridge] source closed — retry in 2s"); setTimeout(connect, 2000); });
  src.on("error", (e) => console.error("[bridge] source error:", e.message));
  src.on("message", (buf) => {
    let m; try { m = JSON.parse(buf.toString()); } catch { return; }
    const msg = m.message || m;
    switch (msg.type || msg.mavtype) {
      case "GLOBAL_POSITION_INT":
        state.lat = msg.lat / 1e7; state.lon = msg.lon / 1e7;
        state.altM = (msg.relative_alt ?? msg.alt) / 1000; state.hdg = msg.hdg / 100; break;
      case "SYS_STATUS":
        state.battPct = msg.battery_remaining; state.voltage = num(msg.voltage_battery) / 1000; break;
      case "VFR_HUD":
        state.groundspeed = msg.groundspeed; if (state.altM == null) state.altM = msg.alt; break;
      case "HEARTBEAT":
        state.armed = (num(msg.base_mode) & 128) !== 0;
        state.mode = MODES[msg.custom_mode] ?? ("MODE " + msg.custom_mode); break;
      default: return;
    }
    tick();
  });
}
connect();
console.log("[bridge] telemetry WebSocket up on ws://127.0.0.1:" + PORT);
