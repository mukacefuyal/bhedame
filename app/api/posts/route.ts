import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { demoPosts } from "@/lib/demo";
import { isOwnMediaUrl, isSafeHttpUrl, normaliseEmbedUrl } from "@/lib/embed";
import type { MediaType } from "@/lib/types";
import { validatePostContent } from "@/lib/antiSpam";
import { checkRateLimit, contentFingerprint, publicPublisherHash } from "@/lib/requestSecurity";
import { displayNameForUser, getRequestActor } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const categories = new Set(["Satire", "Photos", "Screenshots", "Videos", "Hot takes", "Internet archaeology"]);
const publicPostColumns = "id,title,caption,category,media_type,media_url,embed_url,source_url,author_name,author_id,created_at";

function rateLimited(retryAfter: number) {
  return NextResponse.json(
    { error: `Too many posts. Try again in about ${Math.max(1, Math.ceil(retryAfter / 60))} minute(s).` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function GET(request: NextRequest) {
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ posts: demoPosts, demo: true });

  const { data: posts, error } = await db.from("posts").select(publicPostColumns).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = (posts || []).map((p) => p.id);
  if (!ids.length) return NextResponse.json({ posts: [] });

  const fallbackVisitorId = request.headers.get("x-visitor-id") || "";
  const { actorId } = await getRequestActor(request, db, fallbackVisitorId);
  const [{ data: reactions }, { data: comments }] = await Promise.all([
    db.from("reactions").select("post_id,reaction,visitor_id").in("post_id", ids),
    db.from("comments").select("post_id").in("post_id", ids),
  ]);

  const totals = new Map<string, { likes: number; dislikes: number; user: -1 | 0 | 1 }>();
  for (const id of ids) totals.set(id, { likes: 0, dislikes: 0, user: 0 });
  for (const reaction of reactions || []) {
    const item = totals.get(reaction.post_id)!;
    if (reaction.reaction === 1) item.likes++;
    if (reaction.reaction === -1) item.dislikes++;
    if (actorId && reaction.visitor_id === actorId) item.user = reaction.reaction as -1 | 1;
  }
  const commentCounts = new Map<string, number>();
  for (const comment of comments || []) commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) || 0) + 1);

  return NextResponse.json({
    posts: (posts || []).map((p) => {
      const t = totals.get(p.id)!;
      return { ...p, likes: t.likes, dislikes: t.dislikes, score: t.likes - t.dislikes, comments_count: commentCounts.get(p.id) || 0, user_reaction: t.user };
    }),
  });
}

export async function POST(request: NextRequest) {
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase is not configured. Add the environment variables from .env.example before publishing real posts." }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const fallbackVisitorId = String(body.visitorId || "").trim().slice(0, 100);
  const { user, actorId } = await getRequestActor(request, db, fallbackVisitorId);
  const title = String(body.title || "").trim().slice(0, 180);
  const caption = String(body.caption || "").trim().slice(0, 1200);
  const category = String(body.category || "Satire").trim().slice(0, 60);
  const requestedAuthor = String(body.authorName || "").trim().slice(0, 60);
  const authorName = requestedAuthor || displayNameForUser(user);
  const mediaType = body.mediaType as MediaType;
  const mediaUrl = body.mediaUrl ? String(body.mediaUrl) : null;
  const rawEmbedUrl = body.embedUrl ? String(body.embedUrl) : null;
  const embedUrl = rawEmbedUrl ? normaliseEmbedUrl(rawEmbedUrl) : null;
  const sourceUrl = body.sourceUrl ? String(body.sourceUrl) : null;

  if (!actorId) return NextResponse.json({ error: "Missing bheda session. Refresh the page and try again." }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!categories.has(category)) return NextResponse.json({ error: "Unsupported category." }, { status: 400 });
  if (!["image", "video", "embed", "text"].includes(mediaType)) return NextResponse.json({ error: "Unsupported media type." }, { status: 400 });
  if (["image", "video"].includes(mediaType) && !isOwnMediaUrl(mediaUrl)) return NextResponse.json({ error: "Media must be uploaded through bheda.me." }, { status: 400 });
  if (mediaType === "embed" && !embedUrl) return NextResponse.json({ error: "Only valid YouTube or Vimeo embeds are supported." }, { status: 400 });
  if (sourceUrl && !isSafeHttpUrl(sourceUrl)) return NextResponse.json({ error: "Source URL must be http or https." }, { status: 400 });

  const spamError = validatePostContent({ title, caption, authorName, sourceUrl });
  if (spamError) return NextResponse.json({ error: spamError }, { status: 400 });

  try {
    const burst = await checkRateLimit(db, request, "create_post_10m", 4, 10 * 60, actorId);
    if (!burst.allowed) return rateLimited(burst.retryAfter);
    const daily = await checkRateLimit(db, request, "create_post_day", 15, 24 * 60 * 60, actorId);
    if (!daily.allowed) return rateLimited(daily.retryAfter);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rate limiter unavailable." }, { status: 503 });
  }

  const fingerprint = contentFingerprint([title, caption, mediaType, embedUrl, sourceUrl]);
  const publisherHash = publicPublisherHash(request, actorId);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: duplicate, error: duplicateError } = await db.from("posts").select("id")
    .eq("content_fingerprint", fingerprint).eq("publisher_key_hash", publisherHash).gte("created_at", since).limit(1);
  if (duplicateError) return NextResponse.json({ error: duplicateError.message }, { status: 500 });
  if (duplicate?.length) return NextResponse.json({ error: "This looks like a duplicate of a recent post." }, { status: 409 });

  const { data, error } = await db.from("posts").insert({
    title, caption: caption || null, category, media_type: mediaType, media_url: mediaUrl,
    embed_url: embedUrl, source_url: sourceUrl, author_name: authorName || "Anonymous bheda",
    author_id: user?.id || null, content_fingerprint: fingerprint, publisher_key_hash: publisherHash,
  }).select(publicPostColumns).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: { ...data, likes: 0, dislikes: 0, score: 0, comments_count: 0, user_reaction: 0 } }, { status: 201 });
}
