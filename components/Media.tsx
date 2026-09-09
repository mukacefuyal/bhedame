import { AudioLines } from "lucide-react";
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
    return <video className="postMedia" src={post.media_url} controls playsInline preload="metadata" onClick={(e) => e.stopPropagation()} />;
  }

  if (post.media_type === "audio" && post.media_url) {
    return (
      <div className={`audioPost ${compact ? "compact" : ""}`}>
        <div className="audioArtwork"><AudioLines size={compact ? 38 : 54} /></div>
        <div className="audioCopy">
          <span>Audio post</span>
          <strong>{post.title}</strong>
        </div>
        <audio src={post.media_url} controls preload="metadata" onClick={(e) => e.stopPropagation()} />
      </div>
    );
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
