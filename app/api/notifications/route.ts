import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getRequestActor } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ notifications: [] });

  const fallbackVisitorId = request.headers.get("x-visitor-id") || "";
  const { user, actorId } = await getRequestActor(request, db, fallbackVisitorId);
  if (!actorId) return NextResponse.json({ notifications: [] });

  let postQuery = db.from("posts").select("id,title,author_id,publisher_key_hash").order("created_at", { ascending: false }).limit(100);
  if (user?.id) postQuery = postQuery.eq("author_id", user.id);
  else return NextResponse.json({ notifications: [] });

  const { data: posts, error } = await postQuery;
  if (error || !posts?.length) return NextResponse.json({ notifications: [] });

  const postIds = posts.map((p) => p.id);
  const titleById = new Map(posts.map((p) => [p.id, p.title]));

  const [{ data: comments }, { data: reactions }] = await Promise.all([
    db.from("comments").select("id,post_id,author_name,author_id,created_at").in("post_id", postIds).neq("author_id", user!.id).order("created_at", { ascending: false }).limit(50),
    db.from("reactions").select("post_id,visitor_id,reaction,created_at,updated_at").in("post_id", postIds).neq("visitor_id", actorId).order("updated_at", { ascending: false }).limit(50),
  ]);

  const items = [
    ...(comments || []).map((c) => ({
      id: `c-${c.id}`,
      type: "comment" as const,
      text: `${c.author_name} commented on “${titleById.get(c.post_id) || "your post"}”`,
      post_id: c.post_id,
      created_at: c.created_at,
    })),
    ...(reactions || []).map((r) => ({
      id: `r-${r.post_id}-${r.visitor_id}-${r.updated_at}`,
      type: "reaction" as const,
      text: `${r.reaction === 1 ? "Someone liked" : "Someone disliked"} “${titleById.get(r.post_id) || "your post"}”`,
      post_id: r.post_id,
      created_at: r.updated_at || r.created_at,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30);

  return NextResponse.json({ notifications: items });
}
