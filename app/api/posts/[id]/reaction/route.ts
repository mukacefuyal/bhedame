import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/requestSecurity";
import { getRequestActor } from "@/lib/serverAuth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const fallbackVisitorId = String(body.visitorId || "").slice(0, 100);
  const reaction = Number(body.reaction);
  if (![-1, 0, 1].includes(reaction)) return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ demo: true });

  const { actorId } = await getRequestActor(request, db, fallbackVisitorId);
  if (!actorId) return NextResponse.json({ error: "Missing bheda session." }, { status: 400 });

  try {
    const limit = await checkRateLimit(db, request, "reaction_minute", 60, 60, actorId);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many reactions. Try again shortly." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rate limiter unavailable." }, { status: 503 });
  }

  if (reaction === 0) {
    const { error } = await db.from("reactions").delete().eq("post_id", id).eq("visitor_id", actorId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await db.from("reactions").upsert({
      post_id: id,
      visitor_id: actorId,
      reaction,
      updated_at: new Date().toISOString(),
    }, { onConflict: "post_id,visitor_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = await db.from("reactions").select("reaction").eq("post_id", id);
  const likes = (data || []).filter((r) => r.reaction === 1).length;
  const dislikes = (data || []).filter((r) => r.reaction === -1).length;
  return NextResponse.json({ likes, dislikes, score: likes - dislikes, user_reaction: reaction });
}
