import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { demoPosts } from "@/lib/demo";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();
  if (!db) {
    const post = demoPosts.find((p) => p.id === id);
    return post ? NextResponse.json({ post, demo: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { data: post, error } = await db.from("posts").select("*").eq("id", id).single();
  if (error || !post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [{ data: reactions }, { count }] = await Promise.all([
    db.from("reactions").select("reaction").eq("post_id", id),
    db.from("comments").select("*", { count: "exact", head: true }).eq("post_id", id),
  ]);
  const likes = (reactions || []).filter((r) => r.reaction === 1).length;
  const dislikes = (reactions || []).filter((r) => r.reaction === -1).length;
  return NextResponse.json({ post: { ...post, likes, dislikes, score: likes - dislikes, comments_count: count || 0, user_reaction: 0 } });
}
