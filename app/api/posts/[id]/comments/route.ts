import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ comments: [], demo: true });
  const { data, error } = await db.from("comments").select("*").eq("post_id", id).order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data || [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const visitorId = String(body.visitorId || "").slice(0, 100);
  const authorName = String(body.authorName || "Guest sheep").trim().slice(0, 60);
  const text = String(body.body || "").trim().slice(0, 600);
  if (!visitorId || !text) return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ demo: true });
  const { data, error } = await db.from("comments").insert({ post_id: id, visitor_id: visitorId, author_name: authorName || "Guest sheep", body: text }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data }, { status: 201 });
}
