import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { signBody, verifySignature } from "./signature";

const secret = "test-secret";
const body = '{"data":{"type":"button_press"}}';
const hex = createHmac("sha256", secret).update(body).digest("hex");

describe("verifySignature", () => {
  test("good with sha256= prefix", () => expect(verifySignature(body, "sha256=" + hex, secret)).toBe(true));
  test("good without prefix", () => expect(verifySignature(body, hex, secret)).toBe(true));
  test("uppercase hex ok", () => expect(verifySignature(body, "sha256=" + hex.toUpperCase(), secret)).toBe(true));
  test("bad signature", () => expect(verifySignature(body, "sha256=" + "0".repeat(64), secret)).toBe(false));
  test("tampered body", () => expect(verifySignature(body + " ", "sha256=" + hex, secret)).toBe(false));
  test("wrong secret", () => expect(verifySignature(body, "sha256=" + hex, "other")).toBe(false));
  test("missing header", () => {
    expect(verifySignature(body, null, secret)).toBe(false);
    expect(verifySignature(body, "", secret)).toBe(false);
  });
  test("length mismatch does not throw", () => {
    expect(verifySignature(body, "sha256=abcd", secret)).toBe(false);
    expect(verifySignature(body, "sha256=" + hex + "00", secret)).toBe(false);
  });
  test("non-hex", () => expect(verifySignature(body, "sha256=zzzz", secret)).toBe(false));
  test("Buffer body verifies", () => expect(verifySignature(Buffer.from(body), "sha256=" + hex, secret)).toBe(true));
  test("non-utf8 bytes verify over raw Buffer", () => {
    const raw = Buffer.from([0x7b, 0xff, 0xfe, 0x7d]);
    expect(verifySignature(raw, signBody(raw, secret), secret)).toBe(true);
    expect(verifySignature(Buffer.from(raw.toString("utf8")), signBody(raw, secret), secret)).toBe(false);
  });
  test("signBody round-trips", () => expect(verifySignature(body, signBody(body, secret), secret)).toBe(true));
});
