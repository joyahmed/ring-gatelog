import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Ring webhook signature check. Header `X-Signature: sha256=<hex>`, value is
 * HMAC-SHA256 of the RAW body with the signing key. Constant-time compare.
 */
export function verifySignature(
  rawBody: Buffer | string,
  header: string | null | undefined,
  secret: string,
): boolean {
  if (!header || !secret) return false;
  let given = header.trim();
  if (given.toLowerCase().startsWith("sha256=")) given = given.slice(7);
  if (!/^[0-9a-fA-F]+$/.test(given)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const got = Buffer.from(given, "hex");
  if (got.length !== expected.length) return false;
  return timingSafeEqual(got, expected);
}

/** Helper for tests and the replay script: header value for a body. */
export function signBody(rawBody: Buffer | string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
}
