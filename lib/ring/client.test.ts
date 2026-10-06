import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fixtureName, getHistory, listDevices, ringGet, ringMode } from "./client";

const realFetch = globalThis.fetch;
const saved = { ...process.env };
let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(path.join(tmpdir(), "ring-"));
});
afterEach(() => {
  globalThis.fetch = realFetch;
  process.env = { ...saved };
  rmSync(tmp, { recursive: true, force: true });
});

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

describe("fixtureName", () => {
  test("path only", () => expect(fixtureName("/v1/devices")).toBe("v1_devices.json"));
  test("path + query, sorted, safe chars", () => {
    expect(fixtureName("/v1/history/devices/a.b/events", { event_types: "motion.human" })).toBe(
      "v1_history_devices_a.b_events__event_types=motion.human.json",
    );
    expect(fixtureName("/x", { "page[key]": "2025-07-06T11:11:00Z" })).toBe("x__page_key=2025-07-06T11_11_00Z.json");
  });
});

describe("replay (seeded fixtures, no token, no network)", () => {
  test("default mode is replay and fetch is never called", async () => {
    delete process.env.RING_MODE;
    delete process.env.RING_TOKEN;
    delete process.env.RING_FIXTURE_DIR;
    globalThis.fetch = (() => {
      throw new Error("network used");
    }) as unknown as typeof fetch;
    expect(ringMode()).toBe("replay");
    const devs = await listDevices();
    expect(devs.length).toBe(3);
    expect(devs.map((d) => d.name)).toContain("Main Gate");
    const h = (await getHistory("ava1.ring.device.GATE01", "motion.human")) as { data: unknown[] };
    expect(h.data.length).toBe(2);
  });
  test("missing fixture gives a clear error", async () => {
    process.env.RING_FIXTURE_DIR = tmp;
    await expect(ringGet("/v1/nope")).rejects.toThrow(/RING_MODE=record/);
  });
});

describe("live / record (mocked fetch)", () => {
  test("sends Bearer + base url + query", async () => {
    process.env.RING_MODE = "live";
    process.env.RING_TOKEN = "t0k";
    process.env.RING_API_BASE = "https://example.test";
    let seen: { url: string; auth: string | null } | undefined;
    globalThis.fetch = (async (u: string, init: RequestInit) => {
      seen = { url: String(u), auth: new Headers(init.headers).get("Authorization") };
      return json({ data: [] });
    }) as unknown as typeof fetch;
    await ringGet("/v1/history/devices/d/events", { event_types: "ding" });
    expect(seen?.auth).toBe("Bearer t0k");
    expect(seen?.url).toBe("https://example.test/v1/history/devices/d/events?event_types=ding");
  });
  test("401 gives fresh-token message", async () => {
    process.env.RING_MODE = "live";
    process.env.RING_TOKEN = "old";
    globalThis.fetch = (async () => json({ errors: [{ status: "401" }] }, 401)) as unknown as typeof fetch;
    await expect(ringGet("/v1/devices")).rejects.toThrow(/get a fresh Playground token/);
  });
  test("429 waits then retries", async () => {
    process.env.RING_MODE = "live";
    process.env.RING_TOKEN = "t";
    let n = 0;
    globalThis.fetch = (async () =>
      ++n === 1 ? json({}, 429, { "Retry-After": "0" }) : json({ ok: 1 })) as unknown as typeof fetch;
    expect(await ringGet("/v1/devices")).toEqual({ ok: 1 });
    expect(n).toBe(2);
  });
  test("error body shape surfaces title and detail", async () => {
    process.env.RING_MODE = "live";
    process.env.RING_TOKEN = "t";
    globalThis.fetch = (async () =>
      json({ errors: [{ status: "404", title: "Not Found", detail: "no device" }] }, 404)) as unknown as typeof fetch;
    await expect(ringGet("/v1/devices/x")).rejects.toThrow(/Not Found: no device/);
  });
  test("record saves the response, then replay reads it", async () => {
    process.env.RING_MODE = "record";
    process.env.RING_TOKEN = "t";
    process.env.RING_FIXTURE_DIR = tmp;
    globalThis.fetch = (async () => json({ data: [{ id: "z" }] })) as unknown as typeof fetch;
    await ringGet("/v1/devices");
    expect(readdirSync(tmp)).toEqual(["v1_devices.json"]);
    expect(JSON.parse(readFileSync(path.join(tmp, "v1_devices.json"), "utf8"))).toEqual({ data: [{ id: "z" }] });
    process.env.RING_MODE = "replay";
    delete process.env.RING_TOKEN;
    globalThis.fetch = (() => {
      throw new Error("network used");
    }) as unknown as typeof fetch;
    expect(await ringGet("/v1/devices")).toEqual({ data: [{ id: "z" }] });
  });
});
