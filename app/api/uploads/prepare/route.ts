import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"]);

export async function POST(request: Request) {
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const body = await request.json();
  const contentType = String(body.contentType || "");
  const filename = String(body.filename || "file");
  if (!allowed.has(contentType)) return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });

  const rawExt = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "bin";
  const ext = rawExt.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const day = new Date().toISOString().slice(0, 10);
  const path = `${day}/${randomUUID()}.${ext}`;
  const { data, error } = await db.storage.from("media").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: error?.message || "Could not prepare upload." }, { status: 500 });
  const { data: publicData } = db.storage.from("media").getPublicUrl(path);

  return NextResponse.json({ path, token: data.token, publicUrl: publicData.publicUrl });
}
