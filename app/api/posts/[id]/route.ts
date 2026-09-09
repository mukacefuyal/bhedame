import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { demoPosts } from "@/lib/demo";
import { getRequestActor } from "@/lib/serverAuth";

const publicPostColumns = "id,title,caption,category,media_type,media_url,embed_url,source_url,author_name,author_id,created_at";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();
  if (!db) {
    const post = demoPosts.find((p) => p.id === id);
    return post ? NextResponse.json({ post, demo: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { data: post, error } = await db.from("posts").select(publicPostColumns).eq("id", id).single();
  if (error || !post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fallbackVisitorId = request.headers.get("x-visitor-id") || "";
  const { actorId } = await getRequestActor(request, db, fallbackVisitorId);
  const [{ data: reactions }, { count }] = await Promise.all([
    db.from("reactions").select("reaction,visitor_id").eq("post_id", id),
    db.from("comments").select("id", { count: "exact", head: true }).eq("post_id", id),
  ]);
  const likes = (reactions || []).filter((r) => r.reaction === 1).length;
  const dislikes = (reactions || []).filter((r) => r.reaction === -1).length;
  const userReaction = (reactions || []).find((r) => actorId && r.visitor_id === actorId)?.reaction || 0;
  return NextResponse.json({ post: { ...post, likes, dislikes, score: likes - dislikes, comments_count: count || 0, user_reaction: userReaction } });
}
