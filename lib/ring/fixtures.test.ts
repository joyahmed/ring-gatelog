import { describe, expect, test } from "bun:test";
import { fixtureName } from "./client";
import { splitNext } from "./fixtures";

describe("splitNext", () => {
  test("keeps base event_types so page fixtures do not collide", () => {
    const n = splitNext("/v1/history/devices/d/events?page[key]=abc", { event_types: "motion.human" });
    expect(n.query).toEqual({ event_types: "motion.human", "page[key]": "abc" });
    expect(fixtureName(n.path, n.query)).toContain("event_types=motion.human");
  });
  test("next link's own value wins", () => {
    expect(splitNext("/x?event_types=ding", { event_types: "motion" }).query.event_types).toBe("ding");
  });
});
