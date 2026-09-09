"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Send, Share2, X } from "lucide-react";
import type { Comment, Post } from "@/lib/types";
import { Media } from "./Media";
import { RichText } from "./RichText";
import { getVisitorId } from "@/lib/visitor";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "./AuthProvider";

const chips = ["Good catch", "Needs context", "That is wild 😂", "Source?", "Classic bheda moment"];

export function PostDetail({ post, onClose, onChanged, onToken }: {
  post: Post;
  onClose: () => void;
  onChanged: (post: Post) => void;
  onToken?: (token: string) => void;
}) {
  const { displayName, ready } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [commentError, setCommentError] = useState("");

  const localKey = useMemo(() => `bheda-comments-${post.id}`, [post.id]);

  useEffect(() => {
    document.body.classList.add("modalOpen");
    authFetch(`/api/posts/${post.id}/comments`)
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
    if (!clean || sending || !ready) return;
    setSending(true);
    setCommentError("");
    try {
      const res = await authFetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: getVisitorId(), body: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not comment");
      if (data.demo) {
        const comment: Comment = {
          id: crypto.randomUUID(),
          post_id: post.id,
          visitor_id: getVisitorId(),
          author_name: displayName,
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
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : "Could not comment");
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
    try {
      const res = await authFetch(`/api/posts/${post.id}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: getVisitorId(), reaction: desired }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not react");
      if (!data.demo) onChanged({ ...optimistic, ...data });
    } catch {
      onChanged(post);
    }
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
          <span className="eyebrow">{post.category} · posted by {post.author_name}</span>
          <h1>{post.title}</h1>
          {post.caption ? <p className="detailCaption"><RichText text={post.caption} onToken={onToken} /></p> : null}
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
              <div className="emptyComments">Add context, challenge the take, or point people to a source.</div>
            ) : comments.map((comment) => (
              <div className="comment" key={comment.id}>
                <span className="commentAvatar">{comment.author_name.slice(0, 1).toUpperCase()}</span>
                <div><strong>{comment.author_name}</strong><p><RichText text={comment.body} onToken={onToken} /></p></div>
              </div>
            ))}
          </div>
          {commentError ? <div className="commentError" role="alert">{commentError}</div> : null}
          <div className="commentComposer">
            <div className="commentIdentity">Commenting as <strong>{displayName}</strong></div>
            <div className="commentInputRow">
              <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Add a comment, #hashtag or @mention" />
              <button disabled={!body.trim() || sending || !ready} onClick={() => submit()}><Send size={18} /></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
