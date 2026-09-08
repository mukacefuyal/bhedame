"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, MessageCircle, Share2 } from "lucide-react";
import type { Post, ReactionValue } from "@/lib/types";
import { Media } from "./Media";
import { getVisitorId } from "@/lib/visitor";

function formatCount(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}

export function PostCard({ post, onOpen, onChanged }: {
  post: Post;
  onOpen: (post: Post) => void;
  onChanged: (post: Post) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function react(next: ReactionValue) {
    if (busy) return;
    setBusy(true);
    const current = post.user_reaction || 0;
    const desired: ReactionValue = current === next ? 0 : next;

    const optimistic: Post = {
      ...post,
      likes: post.likes + (current === 1 ? -1 : 0) + (desired === 1 ? 1 : 0),
      dislikes: post.dislikes + (current === -1 ? -1 : 0) + (desired === -1 ? 1 : 0),
      score: post.score - current + desired,
      user_reaction: desired,
    };
    onChanged(optimistic);

    try {
      const res = await fetch(`/api/posts/${post.id}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: getVisitorId(), reaction: desired }),
      });
      const data = await res.json();
      if (res.ok && !data.demo) onChanged({ ...optimistic, ...data });
    } catch {
      onChanged(post);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}/p/${post.id}`;
    if (navigator.share) {
      await navigator.share({ title: post.title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <article className="pinCard">
      <button className="mediaButton" onClick={() => onOpen(post)} aria-label={`Open ${post.title}`}>
        <Media post={post} compact />
        <div className="cardOverlay">
          <span className="openBadge"><ExternalLink size={16} /> Open</span>
        </div>
      </button>
      <div className="pinMeta">
        <button className="titleButton" onClick={() => onOpen(post)}>
          <h2>{post.title}</h2>
        </button>
        {post.caption && post.media_type !== "text" ? <p className="captionClamp">{post.caption}</p> : null}
        <div className="metaLine">
          <span className="authorDot">{post.author_name.slice(0, 1).toUpperCase()}</span>
          <span className="authorName">{post.author_name}</span>
          <span className="categoryTag">{post.category}</span>
        </div>
        <div className="reactionBar">
          <button className={post.user_reaction === 1 ? "react active" : "react"} onClick={() => react(1)} aria-label="Like">
            <ArrowUp size={18} /> {formatCount(post.likes)}
          </button>
          <button className={post.user_reaction === -1 ? "react activeDown" : "react"} onClick={() => react(-1)} aria-label="Dislike">
            <ArrowDown size={18} /> {formatCount(post.dislikes)}
          </button>
          <button className="react" onClick={() => onOpen(post)} aria-label="Comments">
            <MessageCircle size={18} /> {formatCount(post.comments_count)}
          </button>
          <button className="react shareMini" onClick={share} aria-label="Share"><Share2 size={18} /></button>
        </div>
      </div>
    </article>
  );
}
