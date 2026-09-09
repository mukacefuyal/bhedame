"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Flame, Images, Landmark, MessageSquareText, MonitorPlay, Sparkles, UsersRound } from "lucide-react";
import type { Post } from "@/lib/types";
import { getVisitorId } from "@/lib/visitor";
import { authFetch } from "@/lib/authFetch";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { PostCard } from "./PostCard";
import { PostDetail } from "./PostDetail";
import { useAuth } from "./AuthProvider";

const categories = [
  { label: "All", icon: Sparkles },
  { label: "Satire", icon: Flame },
  { label: "Politics", icon: Landmark },
  { label: "Society", icon: UsersRound },
  { label: "Screenshots", icon: MessageSquareText },
  { label: "Photos", icon: Images },
  { label: "Videos", icon: MonitorPlay },
  { label: "Audio", icon: AudioLines },
];

export function Feed({ initialPosts }: { initialPosts: Post[] }) {
  const { ready } = useAuth();
  const [posts, setPosts] = useState(initialPosts);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    const visitorId = getVisitorId();
    authFetch("/api/posts", { headers: { "x-visitor-id": visitorId } })
      .then((r) => r.json())
      .then((data) => Array.isArray(data.posts) && setPosts(data.posts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((post) => {
      const categoryMatch = category === "All"
        || post.category.toLowerCase() === category.toLowerCase()
        || (category === "Videos" && ["video", "embed"].includes(post.media_type))
        || (category === "Audio" && post.media_type === "audio");
      const searchMatch = !q || `${post.title} ${post.caption || ""} ${post.author_name} ${post.category}`.toLowerCase().includes(q);
      return categoryMatch && searchMatch;
    });
  }, [posts, search, category]);

  function replacePost(next: Post) {
    setPosts((prev) => prev.map((p) => p.id === next.id ? next : p));
    setActivePost((current) => current?.id === next.id ? next : current);
  }

  function goHome() {
    setSearch("");
    setCategory("All");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function focusSearch() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => searchRef.current?.focus(), 180);
  }

  function filterToken(token: string) {
    setSearch(token);
    setCategory("All");
    setActivePost(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => searchRef.current?.focus(), 180);
  }

  function openRandom() {
    const pool = filtered.length ? filtered : posts;
    if (!pool.length) return;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setActivePost(next);
  }

  return (
    <>
      <Header search={search} setSearch={setSearch} searchInputRef={searchRef} />
      <main className="pageShell">
        <section className="heroCopy">
          <div>
            <span className="kicker">bheda.me</span>
            <h1>Herd thinking,<br /><em>meet receipts.</em></h1>
          </div>
          <p>Screenshots, clips, audio and posts that call out political fanboying, bad takes and absurd ideas — with context, satire and receipts.</p>
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
            {filtered.map((post) => <PostCard key={post.id} post={post} onOpen={setActivePost} onChanged={replacePost} onToken={filterToken} />)}
          </section>
        ) : <div className="emptyFeed"><span>B.</span><h2>No bheda posts here.</h2><p>Try another search, hashtag, mention or category.</p></div>}
      </main>
      <BottomNav onHome={goHome} onSearch={focusSearch} onRandom={openRandom} />
      {activePost ? <PostDetail post={activePost} onClose={() => setActivePost(null)} onChanged={replacePost} onToken={filterToken} /> : null}
    </>
  );
}
