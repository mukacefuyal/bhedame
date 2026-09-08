"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Images, MessageSquareText, MonitorPlay, Sparkles } from "lucide-react";
import type { Post } from "@/lib/types";
import { getVisitorId } from "@/lib/visitor";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { PostCard } from "./PostCard";
import { PostDetail } from "./PostDetail";

const categories = [
  { label: "All", icon: Sparkles },
  { label: "Satire", icon: Flame },
  { label: "Photos", icon: Images },
  { label: "Screenshots", icon: MessageSquareText },
  { label: "Videos", icon: MonitorPlay },
];

export function Feed({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const visitorId = getVisitorId();
    fetch("/api/posts", { headers: { "x-visitor-id": visitorId } })
      .then((r) => r.json())
      .then((data) => Array.isArray(data.posts) && setPosts(data.posts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((post) => {
      const categoryMatch = category === "All" || post.category.toLowerCase() === category.toLowerCase() || (category === "Videos" && ["video", "embed"].includes(post.media_type));
      const searchMatch = !q || `${post.title} ${post.caption || ""} ${post.author_name} ${post.category}`.toLowerCase().includes(q);
      return categoryMatch && searchMatch;
    });
  }, [posts, search, category]);

  function replacePost(next: Post) {
    setPosts((prev) => prev.map((p) => p.id === next.id ? next : p));
    setActivePost((current) => current?.id === next.id ? next : current);
  }

  return (
    <>
      <Header search={search} setSearch={setSearch} />
      <main className="pageShell">
        <section className="heroCopy">
          <div>
            <span className="kicker">bheda.me</span>
            <h1>The internet,<br /><em>slightly roasted.</em></h1>
          </div>
          <p>Photos, screenshots, video, memes and takes that probably should have stayed in the group chat.</p>
        </section>

        <div className="categoryScroller" id="fresh">
          {categories.map(({ label, icon: Icon }) => (
            <button key={label} className={category === label ? "categoryChip active" : "categoryChip"} onClick={() => setCategory(label)}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </div>

        {loading ? <div className="loadingLine"><span /></div> : null}
        {filtered.length ? (
          <section className="masonryFeed" aria-label="Bheda posts">
            {filtered.map((post) => <PostCard key={post.id} post={post} onOpen={setActivePost} onChanged={replacePost} />)}
          </section>
        ) : <div className="emptyFeed"><span>🐑</span><h2>No sheep in this paddock.</h2><p>Try another search or category.</p></div>}
      </main>
      <BottomNav />
      {activePost ? <PostDetail post={activePost} onClose={() => setActivePost(null)} onChanged={replacePost} /> : null}
    </>
  );
}
