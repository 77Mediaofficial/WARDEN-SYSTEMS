# The thermal feed relay (off-the-shelf transport)

Just as the drone is bought, not built, the **video transport is a solved commodity** — we don't
reinvent an RTSP→WebRTC pipeline, we run a free one and build the *layer* on top. Use
[**MediaMTX**](https://github.com/bluenviron/mediamtx) (single binary, open-source, free): it takes
an RTSP feed from *any* thermal camera and re-publishes it as low-latency **WebRTC/WHEP** that the
console's `<video>` reads directly.

## 1. Run the gateway
```bash
# download the MediaMTX release for your OS, then:
./mediamtx            # serves RTSP :8554, WebRTC/WHEP :8889
```

## 2. Push a real thermal feed into it
Point *any* thermal source's RTSP output at `rtsp://<this-machine>:8554/thermal`. Options, cheapest first:

- **A cheap thermal camera** (sub-£300 IP thermal cam, or a phone thermal module + an RTSP app) —
  this is enough to prove "real thermal on the commander view."
- **A test/placeholder feed** (prove the path with zero hardware):
  ```bash
  ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=25 -vf "format=gray" \
    -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://localhost:8554/thermal
  ```
- **Later — a real drone's payload**: most drones expose an RTSP/RTMP stream; point it here.

## 3. Consume it in the console
The console reads WHEP at `http://<this-machine>:8889/thermal/whep`. Put that URL in the console's
`CONFIG.FEED_WHEP` field. The `<video>` element does the WebRTC handshake and shows the live feed.

## Milestone 2 (telemetry, free)
Real position/battery/altitude without a real drone: run **ArduPilot SITL**, which emits genuine
**MAVLink** telemetry. A small bridge (`mavlink → MQTT/WebSocket → console`) feeds the operating
picture exactly as a real airframe would. Same principle: simulate the *protocol*, not the product.

## Why this is honest
Nothing here claims to be the aircraft. It proves the **software path** — real pixels in, governed
record out — which is the part a fire service can't buy off a drone vendor and the part we sell.
