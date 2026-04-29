import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const COOKIE_NAME = "planning_auth";

export interface PlanningSessionPayload {
  v: 1;
  /** Unix seconds */
  exp: number;
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Compare UTF-8 strings via SHA-256 digests (constant-length). */
export function verifyPlanningPassword(
  input: string,
  expectedPassword: string,
): boolean {
  if (!expectedPassword || !input) return false;
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expectedPassword, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function signPlanningSession(
  payload: PlanningSessionPayload,
  secret: string,
): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPlanningSessionToken(
  token: string,
  secret: string,
): PlanningSessionPayload | null {
  if (!secret || !token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(body).digest(
    "base64url",
  );
  if (!timingSafeEqualStrings(sig, expected)) return null;
  try {
    const raw = Buffer.from(body, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as PlanningSessionPayload;
    if (parsed?.v !== 1 || typeof parsed.exp !== "number") return null;
    if (Math.floor(Date.now() / 1000) > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
