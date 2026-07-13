# Real telemetry, free (Milestone 2)

Position, altitude, battery, speed and flight mode flowing into the operating picture — from a
**free drone simulator**, no hardware. Same principle as the video relay: simulate the *protocol*,
not the product. When a real airframe arrives, its MAVLink stream drops into the same pipe.

```
ArduPilot SITL  ──MAVLink──►  mavlink2rest (:8088)  ──►  bridge.mjs  ──ws :8090──►  console
 (free sim)                    (MAVLink → JSON)          (normalise)     (operating picture)
```

## 1. Run ArduPilot SITL (free MAVLink)
Emits genuine MAVLink telemetry as if from a real ArduCopter. Easiest via the ArduPilot dev env or
Docker:
```bash
# ArduPilot checkout:
sim_vehicle.py -v ArduCopter --out=udp:127.0.0.1:14550
# fly it (in the SITL console):  mode guided → arm throttle → takeoff 40
```

## 2. Run mavlink2rest (MAVLink → JSON WebSocket)
A small, well-used gateway that turns MAVLink into JSON over WS (so we never parse binary MAVLink
by hand):
```bash
mavlink2rest --connect=udpin:127.0.0.1:14550 --server=127.0.0.1:8088
# streams JSON at ws://127.0.0.1:8088/v1/ws/mavlink
```

## 3. Run the bridge
```bash
cd telemetry
npm install
npm start                     # serves normalized telemetry at ws://127.0.0.1:8090
```

## 4. Connect the console
Set `CONFIG.TELEMETRY_WS = 'ws://localhost:8090'` in `web/index.html`, open the console, press
**Connect telemetry**. Altitude / battery / speed / mode / position appear live in the operating
picture. When the airframe arms and climbs, the commander can record **DRONE AIRBORNE** to the
governed ledger — a real telemetry event on a signed record.

## Why a bridge (not console-direct-to-MAVLink)
The console never speaks raw MAVLink. The bridge is where the *platform* normalises, rate-limits,
and (later) gates telemetry — the seam where a real product adds auth and per-service policy. For
Milestone 2 it's deliberately dumb transport; the **authed** console decides what reaches the ledger.

_Alternative source:_ if you prefer no extra binary, swap mavlink2rest for a `node-mavlink` UDP
reader inside `bridge.mjs` — the normalised output contract to the console stays identical.
