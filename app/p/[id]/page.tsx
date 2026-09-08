"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Post } from "@/lib/types";
import { PostDetail } from "@/components/PostDetail";

export default function SinglePostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${id}`).then(async (r) => {
      if (!r.ok) throw new Error();
      const data = await r.json();
      setPost(data.post);
    }).catch(() => setMissing(true));
  }, [id]);

  if (missing) return <main className="singleFallback"><span>🐑</span><h1>That post wandered off.</h1><Link href="/">Back home</Link></main>;
  if (!post) return <main className="singleFallback"><div className="spinner" /></main>;

  return (
    <div className="singlePostPage">
      <Link href="/" className="singleBack"><ArrowLeft size={18} /> Home</Link>
      <PostDetail post={post} onClose={() => history.back()} onChanged={setPost} />
    </div>
  );
}
