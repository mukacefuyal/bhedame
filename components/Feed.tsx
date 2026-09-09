"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Flame, Images, Landmark, MessageSquareText, MonitorPlay, Sparkles, Trophy, UsersRound } from "lucide-react";
import type { Post } from "@/lib/types";
import { getVisitorId } from "@/lib/visitor";
import { authFetch } from "@/lib/authFetch";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { PostCard } from "./PostCard";
import { PostDetail } from "./PostDetail";
import { useAuth } from "./AuthProvider";
import { useI18n } from "./I18nProvider";

const categories = [
  { label: "All", key: "all", icon: Sparkles },
  { label: "Satire", key: "satire", icon: Flame },
  { label: "Politics", key: "politics", icon: Landmark },
  { label: "Society", key: "society", icon: UsersRound },
  { label: "Screenshots", key: "screenshots", icon: MessageSquareText },
  { label: "Photos", key: "photos", icon: Images },
  { label: "Videos", key: "videos", icon: MonitorPlay },
  { label: "Audio", key: "audio", icon: AudioLines },
];

export function Feed({ initialPosts }: { initialPosts: Post[] }) {
  const { ready } = useAuth();
  const { t } = useI18n();
  const [posts, setPosts] = useState(initialPosts);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [categorySearch, setCategorySearch] = useState("");
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
      const haystack = `${post.title} ${post.caption || ""} ${post.author_name} @${post.author_name} ${post.category}`.toLowerCase();
      return categoryMatch && (!q || haystack.includes(q));
    });
  }, [posts, search, category]);

  const visibleCategories = categories.filter((item) => {
    const q = categorySearch.trim().toLowerCase();
    return !q || item.label.toLowerCase().includes(q) || t(item.key).toLowerCase().includes(q);
  });

  const contributors = useMemo(() => {
    const stats = new Map<string, { name: string; posts: number; score: number }>();
    for (const post of posts) {
      const current = stats.get(post.author_name) || { name: post.author_name, posts: 0, score: 0 };
      current.posts += 1;
      current.score += post.score || 0;
      stats.set(post.author_name, current);
    }
    return [...stats.values()].sort((a, b) => (b.posts * 10 + b.score) - (a.posts * 10 + a.score)).slice(0, 5);
  }, [posts]);

  function replacePost(next: Post) {
    setPosts((prev) => prev.map((p) => p.id === next.id ? next : p));
    setActivePost((current) => current?.id === next.id ? next : current);
  }

  function goHome() { setSearch(""); setCategory("All"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function focusSearch() { window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => searchRef.current?.focus(), 180); }
  function filterToken(token: string) { setSearch(token); setCategory("All"); setActivePost(null); window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => searchRef.current?.focus(), 180); }
  function openRandom() { const pool = filtered.length ? filtered : posts; if (pool.length) setActivePost(pool[Math.floor(Math.random() * pool.length)]); }

  return (
    <>
      <Header search={search} setSearch={setSearch} searchInputRef={searchRef} />
      <main className="pageShell">
        <section className="heroCopy"><div><span className="kicker">bheda.me</span><h1>{t("heroTitle1")}<br /><em>{t("heroTitle2")}</em></h1></div><p>{t("heroText")}</p></section>
        <section className="feedTools" id="fresh">
          <label className="categorySearchBox"><Sparkles size={16} /><input value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} placeholder={t("categorySearch")} /></label>
          <div className="categoryScroller">{visibleCategories.map(({ label, key, icon: Icon }) => <button key={label} className={category === label ? "categoryChip active" : "categoryChip"} onClick={() => setCategory(label)}><Icon size={17} /> {t(key)}</button>)}</div>
        </section>
        {contributors.length ? <section className="contributorsStrip"><div className="contributorsTitle"><Trophy size={17} /><strong>{t("topContributors")}</strong></div><div className="contributorsList">{contributors.map((person, index) => <button key={person.name} className="contributorPill" onClick={() => filterToken(`@${person.name}`)}><span>{index + 1}</span><strong>{person.name}</strong><small>{person.posts} {t("posts")}</small></button>)}</div></section> : null}
        {loading ? <div className="loadingLine"><span /></div> : null}
        {filtered.length ? <section className="masonryFeed" aria-label="Bheda posts">{filtered.map((post) => <PostCard key={post.id} post={post} onOpen={setActivePost} onChanged={replacePost} onToken={filterToken} />)}</section> : <div className="emptyFeed"><span>B.</span><h2>{t("noPosts")}</h2><p>{t("trySearch")}</p></div>}
      </main>
      <BottomNav onHome={goHome} onSearch={focusSearch} onRandom={openRandom} />
      {activePost ? <PostDetail post={activePost} onClose={() => setActivePost(null)} onChanged={replacePost} onToken={filterToken} /> : null}
    </>
  );
}
