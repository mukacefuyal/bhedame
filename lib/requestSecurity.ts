import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
};

function getClientIp(request: Request) {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    headers.get("x-vercel-forwarded-for") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    forwarded ||
    "unknown"
  );
}

function hashValue(value: string) {
  const salt = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "bheda-rate-limit";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function requestActorKeys(request: Request, visitorId?: string) {
  const ip = getClientIp(request);
  const keys = [`ip:${hashValue(ip)}`];
  if (visitorId) keys.push(`visitor:${hashValue(visitorId)}`);
  return keys;
}

export async function checkRateLimit(
  db: SupabaseClient,
  request: Request,
  action: string,
  limit: number,
  windowSeconds: number,
  visitorId?: string,
): Promise<RateLimitResult> {
  const keys = requestActorKeys(request, visitorId);
  let retryAfter = 0;

  for (const actorKey of keys) {
    const { data, error } = await db.rpc("check_rate_limit", {
      p_actor_key: actorKey,
      p_action: action,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      // Writes should not silently become unprotected if the migration has not been run.
      throw new Error(`Rate limiter unavailable: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.allowed) {
      retryAfter = Math.max(retryAfter, Number(row?.retry_after_seconds || windowSeconds));
      return { allowed: false, retryAfter };
    }
  }

  return { allowed: true, retryAfter: 0 };
}

export function contentFingerprint(parts: Array<string | null | undefined>) {
  const normalised = parts
    .map((part) => String(part || "").toLowerCase().replace(/\s+/g, " ").trim())
    .join("|");
  return createHash("sha256").update(normalised).digest("hex");
}

export function publicPublisherHash(request: Request, actorId?: string) {
  if (actorId) return hashValue(`auth:${actorId}`);
  return requestActorKeys(request)[0].replace("ip:", "");
}
