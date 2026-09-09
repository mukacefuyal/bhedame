import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { validateCommentContent } from "@/lib/antiSpam";
import { checkRateLimit } from "@/lib/requestSecurity";
import { displayNameForUser, getRequestActor } from "@/lib/serverAuth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ comments: [], demo: true });
  const { data, error } = await db.from("comments").select("id,post_id,author_id,author_name,body,created_at").eq("post_id", id).order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data || [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const fallbackVisitorId = String(body.visitorId || "").slice(0, 100);
  const text = String(body.body || "").trim().slice(0, 600);
  if (!text) return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });

  const spamError = validateCommentContent(text);
  if (spamError) return NextResponse.json({ error: spamError }, { status: 400 });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ demo: true });

  const { user, actorId } = await getRequestActor(request, db, fallbackVisitorId);
  if (!actorId) return NextResponse.json({ error: "Missing session." }, { status: 400 });
  const authorName = displayNameForUser(user, actorId);

  try {
    const burst = await checkRateLimit(db, request, "comment_minute", 8, 60, actorId);
    if (!burst.allowed) return NextResponse.json({ error: "You're commenting too quickly. Try again shortly." }, { status: 429, headers: { "Retry-After": String(burst.retryAfter) } });
    const hourly = await checkRateLimit(db, request, "comment_hour", 40, 60 * 60, actorId);
    if (!hourly.allowed) return NextResponse.json({ error: "Comment limit reached for now. Please try again later." }, { status: 429, headers: { "Retry-After": String(hourly.retryAfter) } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rate limiter unavailable." }, { status: 503 });
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: duplicate } = await db.from("comments").select("id").eq("visitor_id", actorId).eq("body", text).gte("created_at", tenMinutesAgo).limit(1);
  if (duplicate?.length) return NextResponse.json({ error: "You already posted that comment recently." }, { status: 409 });

  const { data, error } = await db.from("comments").insert({
    post_id: id, visitor_id: actorId, author_id: user?.id || null,
    author_name: authorName, body: text,
  }).select("id,post_id,author_id,author_name,body,created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data }, { status: 201 });
}
