import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const visitorId = String(body.visitorId || "").slice(0, 100);
  const reaction = Number(body.reaction);
  if (!visitorId || ![-1, 0, 1].includes(reaction)) return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ demo: true });

  if (reaction === 0) {
    const { error } = await db.from("reactions").delete().eq("post_id", id).eq("visitor_id", visitorId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await db.from("reactions").upsert({ post_id: id, visitor_id: visitorId, reaction }, { onConflict: "post_id,visitor_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = await db.from("reactions").select("reaction").eq("post_id", id);
  const likes = (data || []).filter((r) => r.reaction === 1).length;
  const dislikes = (data || []).filter((r) => r.reaction === -1).length;
  return NextResponse.json({ likes, dislikes, score: likes - dislikes, user_reaction: reaction });
}
