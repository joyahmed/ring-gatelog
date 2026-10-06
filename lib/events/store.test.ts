import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendEvents, listDays, readEvents } from "./store";
import type { GateEvent } from "./types";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gatelog-store-"));
const prev = process.env.GATELOG_DATA_DIR;
const TZ = "Asia/Dhaka";

const ev = (id: string, at: string): GateEvent => ({ id, deviceId: "d1", kind: "human", at, source: "replay" });

beforeEach(() => {
  process.env.GATELOG_DATA_DIR = path.join(dir, crypto.randomUUID()); // fresh, not yet created
});
afterAll(() => {
  process.env.GATELOG_DATA_DIR = prev;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("store", () => {
  test("empty store reads as empty", () => {
    expect(readEvents({ day: "2026-10-06", tz: TZ })).toEqual([]);
    expect(listDays(TZ)).toEqual([]);
  });

  test("creates the data dir and dedupes by id across and within batches", () => {
    expect(appendEvents([ev("a", "2026-10-06T04:00:00Z"), ev("a", "2026-10-06T04:00:00Z")])).toEqual({ added: 1, skipped: 1 });
    expect(appendEvents([ev("a", "2026-10-06T04:00:00Z"), ev("b", "2026-10-06T05:00:00Z")])).toEqual({ added: 1, skipped: 1 });
    const file = path.join(process.env.GATELOG_DATA_DIR!, "events.jsonl");
    expect(fs.readFileSync(file, "utf8").trim().split("\n")).toHaveLength(2);
  });

  test("reads one local day sorted, split at Dhaka midnight (18:00 UTC)", () => {
    appendEvents([
      ev("late", "2026-10-06T10:00:00Z"),
      ev("prevDay", "2026-10-05T17:59:59Z"),
      ev("early", "2026-10-05T18:00:00Z"),
      ev("nextDay", "2026-10-06T18:00:00Z"),
    ]);
    expect(readEvents({ day: "2026-10-06", tz: TZ }).map((e) => e.id)).toEqual(["early", "late"]);
    expect(listDays(TZ)).toEqual(["2026-10-07", "2026-10-06", "2026-10-05"]);
  });

  test("a torn line does not break reading", () => {
    appendEvents([ev("ok", "2026-10-06T04:00:00Z")]);
    fs.appendFileSync(path.join(process.env.GATELOG_DATA_DIR!, "events.jsonl"), '{"id":"tor');
    expect(readEvents({ day: "2026-10-06", tz: TZ }).map((e) => e.id)).toEqual(["ok"]);
  });
});
