"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Send, Share2, X } from "lucide-react";
import type { Comment, Post } from "@/lib/types";
import { Media } from "./Media";
import { getVisitorId } from "@/lib/visitor";

const chips = ["Love it ❤️", "Brilliant!", "Unhinged 😂", "Needs context", "Looks good!"];

export function PostDetail({ post, onClose, onChanged }: {
  post: Post;
  onClose: () => void;
  onChanged: (post: Post) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("Guest sheep");
  const [sending, setSending] = useState(false);

  const localKey = useMemo(() => `bheda-comments-${post.id}`, [post.id]);

  useEffect(() => {
    document.body.classList.add("modalOpen");
    fetch(`/api/posts/${post.id}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (data.demo) {
          const saved = localStorage.getItem(localKey);
          setComments(saved ? JSON.parse(saved) : []);
        } else if (Array.isArray(data.comments)) {
          setComments(data.comments);
        }
      })
      .catch(() => {});
    return () => document.body.classList.remove("modalOpen");
  }, [post.id, localKey]);

  async function submit(text = body) {
    const clean = text.trim();
    if (!clean || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: getVisitorId(), authorName: author.trim() || "Guest sheep", body: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not comment");
      if (data.demo) {
        const comment: Comment = {
          id: crypto.randomUUID(),
          post_id: post.id,
          visitor_id: getVisitorId(),
          author_name: author.trim() || "Guest sheep",
          body: clean,
          created_at: new Date().toISOString(),
        };
        const next = [comment, ...comments];
        setComments(next);
        localStorage.setItem(localKey, JSON.stringify(next));
      } else {
        setComments((prev) => [data.comment, ...prev]);
      }
      setBody("");
      onChanged({ ...post, comments_count: post.comments_count + 1 });
    } finally {
      setSending(false);
    }
  }

  async function quickReact(reaction: 1 | -1) {
    const current = post.user_reaction || 0;
    const desired = current === reaction ? 0 : reaction;
    const optimistic = {
      ...post,
      likes: post.likes + (current === 1 ? -1 : 0) + (desired === 1 ? 1 : 0),
      dislikes: post.dislikes + (current === -1 ? -1 : 0) + (desired === -1 ? 1 : 0),
      score: post.score - current + desired,
      user_reaction: desired as -1 | 0 | 1,
    };
    onChanged(optimistic);
    await fetch(`/api/posts/${post.id}/reaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId: getVisitorId(), reaction: desired }),
    }).catch(() => {});
  }

  async function share() {
    const url = `${window.location.origin}/p/${post.id}`;
    if (navigator.share) await navigator.share({ title: post.title, url });
    else await navigator.clipboard.writeText(url);
  }

  return (
    <div className="detailBackdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="detailModal" role="dialog" aria-modal="true" aria-label={post.title}>
        <button className="closeFab" onClick={onClose}><X size={22} /></button>
        <div className="detailMediaPanel">
          <Media post={post} />
        </div>
        <div className="detailInfo">
          <div className="detailTopActions">
            <button className="circleAction" onClick={share}><Share2 size={20} /></button>
            {post.source_url ? (
              <a className="sourceButton" target="_blank" rel="noreferrer" href={post.source_url}><ExternalLink size={17} /> Visit source</a>
            ) : null}
          </div>
          <span className="eyebrow">{post.category}</span>
          <h1>{post.title}</h1>
          {post.caption ? <p className="detailCaption">{post.caption}</p> : null}
          <div className="detailReactionRow">
            <button className={post.user_reaction === 1 ? "bigReact active" : "bigReact"} onClick={() => quickReact(1)}><ArrowUp size={20} /> {post.likes}</button>
            <button className={post.user_reaction === -1 ? "bigReact activeDown" : "bigReact"} onClick={() => quickReact(-1)}><ArrowDown size={20} /> {post.dislikes}</button>
            <span className="scoreLabel">score {post.score >= 0 ? "+" : ""}{post.score}</span>
          </div>
          <div className="commentHeader"><strong>Comments</strong><span>{post.comments_count}</span></div>
          <div className="quickChips">
            {chips.map((chip) => <button key={chip} onClick={() => submit(chip)}>{chip}</button>)}
          </div>
          <div className="commentsList">
            {comments.length === 0 ? (
              <div className="emptyComments">Share feedback, ask a question or give a high five.</div>
            ) : comments.map((comment) => (
              <div className="comment" key={comment.id}>
                <span className="commentAvatar">{comment.author_name.slice(0, 1).toUpperCase()}</span>
                <div><strong>{comment.author_name}</strong><p>{comment.body}</p></div>
              </div>
            ))}
          </div>
          <div className="commentComposer">
            <input className="nameInput" value={author} onChange={(e) => setAuthor(e.target.value)} aria-label="Your name" />
            <div className="commentInputRow">
              <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Add a comment" />
              <button disabled={!body.trim() || sending} onClick={() => submit()}><Send size={18} /></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
