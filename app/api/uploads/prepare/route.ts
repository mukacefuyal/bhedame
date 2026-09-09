import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/requestSecurity";
import { getRequestActor } from "@/lib/serverAuth";

const allowed = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm",
]);
const maxImageBytes = 15 * 1024 * 1024;
const maxAudioBytes = 30 * 1024 * 1024;
const maxVideoBytes = 120 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Upload service is not configured yet." }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const fallbackVisitorId = String(body.visitorId || "").slice(0, 100);
  const { actorId } = await getRequestActor(request, db, fallbackVisitorId);
  const contentType = String(body.contentType || "");
  const filename = String(body.filename || "file").slice(0, 180);
  const size = Number(body.size || 0);
  if (!actorId) return NextResponse.json({ error: "Missing session. Refresh and try again." }, { status: 400 });
  if (!allowed.has(contentType)) return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  if (!Number.isFinite(size) || size <= 0) return NextResponse.json({ error: "Invalid file size." }, { status: 400 });

  const isVideo = contentType.startsWith("video/");
  const isAudio = contentType.startsWith("audio/");
  const maxBytes = isVideo ? maxVideoBytes : isAudio ? maxAudioBytes : maxImageBytes;
  if (size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    const label = isVideo ? "Video" : isAudio ? "Audio" : "Image";
    return NextResponse.json({ error: `${label} uploads are limited to ${mb} MB.` }, { status: 413 });
  }

  try {
    const burst = await checkRateLimit(db, request, "upload_10m", 8, 10 * 60, actorId);
    if (!burst.allowed) return NextResponse.json({ error: "Too many upload attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(burst.retryAfter) } });
    const daily = await checkRateLimit(db, request, "upload_day", 30, 24 * 60 * 60, actorId);
    if (!daily.allowed) return NextResponse.json({ error: "Daily upload limit reached. Try again tomorrow." }, { status: 429, headers: { "Retry-After": String(daily.retryAfter) } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rate limiter unavailable." }, { status: 503 });
  }

  const rawExt = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "bin";
  const ext = rawExt.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const day = new Date().toISOString().slice(0, 10);
  const path = `${actorId}/${day}/${randomUUID()}.${ext}`;
  const { data, error } = await db.storage.from("media").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: error?.message || "Could not prepare upload." }, { status: 500 });
  const { data: publicData } = db.storage.from("media").getPublicUrl(path);
  return NextResponse.json({ path, token: data.token, publicUrl: publicData.publicUrl });
}
