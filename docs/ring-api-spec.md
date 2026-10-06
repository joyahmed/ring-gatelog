# Ring Partner API - spec for the GateLog client and replay fixtures

Researched 2026-10-06. Labels: SOURCE = copied from the cited place. INFERRED = our guess, do not trust.
- DOC = https://developer.amazon.com/docs/ring/api-documentation.html (one page, ~350 KB; section names given)
- SAMPLE = github.com/AmazonAppDev/ring-api-helloworld (cloned depth 1; read only, nothing run)
- The pages /docs/ring/notifications.html and /device-discovery.html return 404. Everything is on the one DOC page.
- "Placeholders" like `<device_id>` are the docs' own, not ours.

## 1. Common

| Item | Value | Source |
|---|---|---|
| Base URL | `https://api.amazonvision.com` | DOC "Base URL"; SAMPLE every `API_BASE` |
| Auth header | `Authorization: Bearer <access_token>` | DOC; SAMPLE app/api/ring/devices/route.ts |
| Playground token | ~30 min, no OAuth needed | SAMPLE README.md:32 |
| OAuth token endpoint | `POST https://oauth.ring.com/oauth/token`, form-encoded: `grant_type=refresh_token, refresh_token, client_id, client_secret` | DOC "Refresh Token Exchange"; SAMPLE lib/auth.ts |
| Rate limit | 100 req/s per partner client_id; 429 + `Retry-After`; headers `X-RateLimit-Limit`, `X-RateLimit-Remaining` | DOC "Rate Limiting" |
| Error body | `{"errors":[{"status":"404","title":"Not Found","detail":"..."}]}` (media downloads: binary on success, this shape on error) | DOC "Error Response Format" |
| Content type | JSON:API style envelopes (`data`, `type`, `id`, `attributes`, `relationships`, `links`, `meta`) | DOC |

Refresh response (SOURCE: DOC "Refresh Token Exchange"):
```json
{ "access_token": "xxxxx", "refresh_token": "yyyyy", "scope": "<scope>", "expires_in": 14400, "token_type": "Bearer" }
```
Refresh flow in SAMPLE lib/auth.ts: cache the token, refresh when `Date.now() >= expiresAt`, where `expiresAt = now + expires_in*1000 - 60000` (60 s early). No Authorization header on the refresh call.
Scope `ava.v1:read` and 30-min Playground life: from the brief, not found in DOC text (DOC shows `"scope": "<scope>"` and 14400 s for OAuth tokens).

## 2. Endpoints

| Method | Path | Params / body | Auth | Source |
|---|---|---|---|---|
| GET | `/v1/devices` | `?include=status,capabilities,location,configurations` | Bearer | DOC endpoint table; SAMPLE devices/route.ts, scripts/list_devices.py |
| GET | `/v1/devices/{id}` | none | Bearer | DOC table |
| GET | `/v1/devices/{id}/status` | none | Bearer | DOC; SAMPLE scripts/device_status.py |
| GET | `/v1/devices/{id}/capabilities` | `?component_id=N` | Bearer | DOC |
| GET | `/v1/devices/{id}/location` | none | Bearer | DOC |
| GET | `/v1/devices/{id}/configurations` | `?component_id=N` | Bearer | DOC |
| GET | `/v1/history/devices/{id}/events` | `event_types` (comma list, dotted subtypes, OR-combined), `page[key]` (ISO cursor) | Bearer | DOC "Event History"; SAMPLE scripts/event_history.py |
| POST | `/v1/devices/{id}/media/image/download` | JSON body (below) -> 303 + `Location` -> GET binary | Bearer | DOC "Image Snapshots" |
| POST | `/v1/devices/{id}/media/video/download` | body with `components` | Bearer | DOC table (body shape not read) |
| POST | `/v1/devices/{id}/media/streaming/whep/sessions` | `?component_id=N`; body = SDP offer, `Content-Type: application/sdp` | Bearer | DOC table; SAMPLE app/api/ring/stream/route.ts |
| DELETE | `/v1/devices/{id}/media/streaming/whep/sessions/{session_id}` | none | Bearer | DOC table (SAMPLE deletes the `Location` URL it got back) |
| - | `rtsps://video.rtsp.amazonvision.com:322/v1/devices/{id}/stream` | `?component_id=N` | (not read) | DOC table |
| GET | `/v1/users/me` | none | Bearer | DOC; SAMPLE scripts/user_profile.py |
| GET | `/v1/accounts/me/subscriptions` | none | Bearer | DOC table (shape not read) |

Not in DOC for history: **no time-range parameters** (no start/end filter), only `event_types` and `page[key]`. Order is newest first.
The SAMPLE's `/api/ring/events` does NOT call Ring: it returns an in-memory store of webhooks received (SAMPLE app/api/ring/events/route.ts comment: "Ring doesn't have a polling API for events" - contradicts the DOC, which does have history).

## 3. Responses

### GET /v1/devices
SOURCE: DOC "Device Discovery > Response Structure" (verbatim, one device)
```json
{
  "meta": { "time": "2026-02-14T22:57:16Z" },
  "data": [{
    "type": "devices",
    "id": "ava1.ring.device.XXXYYY",
    "attributes": { "name": "Front Door Camera" },
    "relationships": {
      "status":         { "data": { "type": "device-status", "id": "ava1.ring.device.status.XXXYYY" },
                          "links": { "related": "/v1/devices/ava1.ring.device.XXXYYY/status" } },
      "capabilities":   { "data": { "type": "device-capabilities", "id": "ava1.ring.device.capabilities.XXXYYY" },
                          "links": { "related": "/v1/devices/ava1.ring.device.XXXYYY/capabilities" } },
      "configurations": { "data": { "type": "device-configurations", "id": "ava1.ring.device.configurations.XXXYYY" },
                          "links": { "related": "/v1/devices/ava1.ring.device.XXXYYY/configurations" } },
      "location":       { "data": { "type": "locations", "id": "5ecd04ff-3d93-4a6e-80e4-035f735a58e4" },
                          "links": { "related": "/v1/devices/ava1.ring.device.XXXYYY/location" } }
    }
  }]
}
```
Field list in DOC also names `data[].attributes.image_url` (string, square product image) - listed in the table but absent from the example. The SAMPLE reads `attributes.online`, `attributes.capabilities`, `attributes.description` from this response (devices/route.ts); the DOC does NOT show those there (online lives in /status). Treat them as the sample's unverified assumption.

### GET /v1/devices/{id}/status
SOURCE: DOC "Status > Response Structure"
```json
{ "meta": { "time": "2025-07-07T10:30:00Z" },
  "data": { "type": "device-status", "id": "xxxyyy.status", "attributes": { "online": true } } }
```

### GET /v1/history/devices/{id}/events
SOURCE: DOC "Event History > Response (200 OK)". Values in `<...>` are the docs' placeholders; the two example events are from the doc.
```json
{
  "data": [
    { "type": "history-events", "id": "<event_id>",
      "attributes": { "event_type": "on_demand", "is_third_party_reviewed": true,
                      "start": 1699457230000, "end": 1699457260000 },
      "relationships": { "source": { "data": { "type": "devices", "id": "<device_id>" } } } },
    { "type": "history-events", "id": "<event_id>",
      "attributes": { "event_type": "motion", "is_third_party_reviewed": false,
                      "start": 1699457200000, "end": 1699457225000 },
      "relationships": { "source": { "data": { "type": "devices", "id": "<device_id>" } } } }
  ],
  "links": { "next": "/v1/history/devices/<device_id>/events?page[key]=2025-07-06T11:11:00Z" }
}
```
- Attributes: exactly 4 (`event_type`, `is_third_party_reviewed`, `start`, `end`; start/end are epoch ms numbers). `id` is opaque; do not parse.
- DISCREPANCY with the brief: DOC shows ONE relationship (`source`) and NO `meta` on history. If the live sandbox returns 2 relationships and `meta`, that is not documented; capture a real response before trusting the DOC. The live sandbox response is unverified here.
- Event types (DOC): `motion` (subtypes `motion.human`, `motion.vehicle`, `motion.animal`, `motion.other_motion`), `on_demand`, `ding`. Note history subtype names include `animal`; the webhook sub_type list does not (below).
- Pagination: follow `links.next` verbatim (prepend base URL); absent = last page. Empty: `{"data": [], "links": {"next": "..."}}` (the doc shows `next` even when empty).
- `event_type` is plain (`motion`); the subtype is NOT shown in `attributes` in the doc example. INFERRED: GateLog cannot read human/vehicle from history rows; it can only filter by `event_types=motion.human`.

### POST /v1/devices/{id}/media/image/download
SOURCE: DOC "Image Snapshots" (request body example; "types" are `at_timestamp` and a second mode whose name was cut off in my read - not captured)
```json
{ "type": "at_timestamp", "timestamp": 1787176751000,
  "image_options": { "format": "jpeg", "resolution": { "width": 1920, "height": 1080 } },
  "components": [ { "component_id": "1" } ] }
```
Flow: POST -> `303 See Other` with pre-signed `Location: /v1/download?security_token=...&req_type=image_download&req_id=...` (time-limited) -> GET returns binary. SOURCE: DOC.
```
HTTP/1.1 200 OK
Content-Type: image/jpeg
X-Request-ID: <request_id>
X-Media-Timestamp: 1699457230000
X-Media-Origin: recording        (or "snapshot")
```
`components` is only needed on multi-camera devices (one entry max). Minimal body used in the DOC's own Python: `{"type":"at_timestamp","timestamp":<epoch ms>}`.
Video download: body shape not read. INFERRED: similar `type` + timestamps + `components`; do not code against it.
The SAMPLE has NO snapshot/thumbnail call. Its webhook type has an optional `thumbnail_url`, which appears nowhere in the DOC payloads (see section 5).

### POST .../media/streaming/whep/sessions (live view)
SOURCE: SAMPLE app/api/ring/stream/route.ts. Request: header `Content-Type: application/sdp`, body = raw SDP offer string. Response: body = SDP answer text; the session URL is in the `Location` response header. Close: `DELETE <that Location URL>` with the Bearer token.

## 4. Webhooks (v1.1)

Delivery rules, SOURCE: DOC "Notifications".
- Header `X-Signature: sha256=<hex>`; HMAC-SHA256 of the RAW request body bytes with the partner HMAC signing key, hex digest, compare in constant time; strip the `sha256=` prefix first. Verify before parsing. (Nonces for account linking use URL-safe base64 instead.)
- 2xx = delivered; 4xx = permanent failure, no retry (10+ consecutive in 24 h may disable the endpoint); 5xx or no answer within 5 s = retry.
- Retries: 7 attempts total, delays after the previous: 0, 1 s, 5 s, 30 s, 2 min, 10 min, 1 h. Then a dead-letter queue, kept 72 h (replay by asking Ring).
- Idempotency key: `meta.request_id`.
- The SAMPLE does NOT verify X-Signature. It compares `Authorization` to `Bearer ${RING_WEBHOOK_SECRET}` only if that env var is set (SAMPLE app/api/webhook/route.ts). This contradicts the DOC; follow the DOC.

### motion_detected
SOURCE: DOC "Motion Detection > Webhook Payload" (verbatim)
```json
{
  "meta": { "version": "1.1", "time": "2026-02-13T13:39:57.200155525Z",
            "request_id": "2ad45ade-1818-4154-813b-afdd8bcd8085", "account_id": "ava1.ring.account.XXXYYY" },
  "data": {
    "id": "<device_id>_motion_<timestamp>",
    "type": "motion_detected",
    "attributes": { "source": "<device_id>", "source_type": "devices", "timestamp": 1786715596787,
                    "timestamp_readable": "2026-08-14 08:53:16", "sub_type": "motion", "component_ids": ["0"] },
    "relationships": { "devices": { "links": { "self": "/v1/devices/<device_id>" } } }
  }
}
```
- `sub_type`: Smart Alerts off -> always `motion`. On -> `human`, `vehicle`, `package_delivery`, `other_motion`. SOURCE: DOC "Motion Detection > Event Data". (`animal` is NOT in this list.)
- `id` format: `<device_id>_<sub_type>_<timestamp>` per the field text, but the example shows `_motion_` while sub_type is `motion` (consistent). Whether human events use `_human_` : follows the text, unverified live.
- `timestamp_readable` has no timezone; use `timestamp` (epoch ms). `component_ids` only on multi-camera devices (INFERRED: omit it in single-camera fixtures; the doc example includes it).
- Note the example's `meta.time` (2026-02-13) and `timestamp` (2026-08-14) disagree: the doc example is not internally consistent. In fixtures keep them equal.

### button_press
SOURCE: DOC "Button Press > Webhook Payload" (verbatim)
```json
{
  "meta": { "version": "1.1", "time": "2026-02-14T00:02:53.027052438Z",
            "request_id": "c83081fc-2f1b-4cb7-8b18-b18a318b8bab", "account_id": "ava1.ring.account.XXXYYY" },
  "data": {
    "id": "<device_id>_button_press_<timestamp>",
    "type": "button_press",
    "attributes": { "source": "<device_id>", "source_type": "devices", "timestamp": 1771027372393 },
    "relationships": { "devices": { "links": { "self": "/v1/devices/<device_id>" } } }
  }
}
```

### contact_sensor_faulted / contact_sensor_cleared
SOURCE: DOC "Sensors > Sensor webhook payload" (verbatim for faulted; cleared uses the same envelope with `data.type` changed, per the doc text "varying only in data.type"). Faulted = contact opens; cleared = contact closes.
```json
{
  "meta": { "version": "1.1", "time": "2026-03-10T14:22:20.258000314Z",
            "request_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-1773152538431-contact_senso",
            "account_id": "ava1.ring.account.XXXXXXXX" },
  "data": {
    "id": "<device_id>_<event_type>_<timestamp>",
    "type": "contact_sensor_faulted",
    "attributes": { "source": "<device_id>", "source_type": "devices", "timestamp": 1773152538431 },
    "relationships": { "devices": { "links": { "self": "/v1/devices/<device_id>" } } }
  }
}
```
Cleared example: INFERRED by swapping `type` (and the id's `<event_type>` part); no separate example was shown. The doc's example `request_id` is truncated ("...-contact_senso"); real ids look like a UUID, possibly with a `-<epoch ms>-<type prefix>` suffix for sensors. Unverified.
Other sensor types named in the DOC (same envelope): tamper_detected/cleared, flood_detected/cleared, freeze_detected/cleared, temperature_exceeded/cleared (extra `temperature`, `threshold_type`).

## 5. SAMPLE webhook shape (do NOT use for fixtures)
SOURCE: SAMPLE lib/schemas/webhook.ts, app/api/webhook/test/route.ts. Meta has only `version, time, request_id` (no `account_id`); `data.type` enum is `motion_detected|device_added|device_removed|person_detected`; attributes allow `confidence`, `bounding_box`, `thumbnail_url`. None of `confidence`, `bounding_box`, `thumbnail_url`, `person_detected` appear in the DOC webhook payloads: the sample's test route generates them itself with random numbers (`version: '1.0'`). Treat as invented by the sample author. The sample's schema would also reject `button_press` and the sensor events (falls back to generic normalization).

## 6. For the fixture writer
1. Use section 4 payloads and section 3 history shape; set `meta.time` = ISO of `attributes.timestamp`.
2. Sign replayed webhooks: `X-Signature: sha256=` + hex HMAC-SHA256(rawBody, key). Test against raw bytes.
3. Sandbox facts from the brief (1 device, 4 history events, 30 min token, CORS = server-side only) are not in the DOC or sample; keep them labelled "from brief".
4. Open gaps: live history response (2 relationships + meta?) not verified; snapshot second search mode, video download body, capabilities/configurations/location/users-me response shapes not read.
