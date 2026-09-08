import type { Post } from "@/lib/types";

export function Media({ post, compact = false }: { post: Post; compact?: boolean }) {
  if (post.media_type === "text") {
    return (
      <div className={`textPost ${compact ? "compact" : ""}`}>
        <span className="quoteMark">“</span>
        <p>{post.caption || post.title}</p>
      </div>
    );
  }

  if (post.media_type === "video" && post.media_url) {
    return <video className="postMedia" src={post.media_url} controls playsInline preload="metadata" />;
  }

  if (post.media_type === "embed" && post.embed_url) {
    return (
      <div className="embedWrap">
        <iframe
          src={post.embed_url}
          title={post.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (post.media_url) {
    return <img className="postMedia" src={post.media_url} alt={post.title} loading="lazy" />;
  }

  return null;
}
