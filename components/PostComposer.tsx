"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Image as ImageIcon, Link2, LoaderCircle, Type, UploadCloud, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { normaliseEmbedUrl } from "@/lib/embed";
import type { MediaType } from "@/lib/types";
import { getVisitorId } from "@/lib/visitor";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "./AuthProvider";

const tabs: { value: MediaType; label: string; icon: typeof ImageIcon }[] = [
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "video", label: "Video", icon: Video },
  { value: "embed", label: "Embed", icon: Link2 },
  { value: "text", label: "Text", icon: Type },
];

export function PostComposer() {
  const router = useRouter();
  const { displayName, ready, openAccount } = useAuth();
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [file, setFile] = useState<File | null>(null);
  const [embedInput, setEmbedInput] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Satire");
  const [sourceUrl, setSourceUrl] = useState("");
  const [author, setAuthor] = useState("Anonymous bheda");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);

  useEffect(() => {
    if (ready) setAuthor(displayName);
  }, [displayName, ready]);

  async function uploadSelectedFile() {
    if (!file) return null;
    const prep = await authFetch("/api/uploads/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, visitorId: getVisitorId() }),
    });
    const details = await prep.json();
    if (!prep.ok) throw new Error(details.error || "Storage is not configured yet.");

    const supabase = getSupabaseBrowser();
    if (!supabase) throw new Error("Missing public Supabase environment variables.");
    const { error: uploadError } = await supabase.storage
      .from("media")
      .uploadToSignedUrl(details.path, details.token, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    return details.publicUrl as string;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Give the post a title.");
    if ((mediaType === "image" || mediaType === "video") && !file) return setError("Choose a file to upload.");
    if (mediaType === "embed" && !normaliseEmbedUrl(embedInput)) return setError("Paste a valid YouTube or Vimeo link.");

    setBusy(true);
    try {
      const mediaUrl = (mediaType === "image" || mediaType === "video") ? await uploadSelectedFile() : null;
      const embedUrl = mediaType === "embed" ? normaliseEmbedUrl(embedInput) : null;
      const res = await authFetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), caption: caption.trim(), category, mediaType,
          mediaUrl, embedUrl, sourceUrl: sourceUrl.trim(), authorName: author.trim() || "Anonymous bheda",
          visitorId: getVisitorId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not publish post.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="composerPage">
      <div className="composerHeader">
        <Link href="/" className="iconButton"><ArrowLeft size={20} /></Link>
        <div><span className="kicker">New post</span><h1>Put it on the board.</h1></div>
        <button type="button" className="composerAccount" onClick={openAccount}>{displayName}</button>
      </div>

      <form className="composerGrid" onSubmit={submit}>
        <section className="mediaComposer">
          <div className="mediaTabs">
            {tabs.map(({ value, label, icon: Icon }) => (
              <button type="button" key={value} className={mediaType === value ? "mediaTab active" : "mediaTab"} onClick={() => { setMediaType(value); setFile(null); }}>
                <Icon size={18} /> {label}
              </button>
            ))}
          </div>

          {(mediaType === "image" || mediaType === "video") ? (
            <label className="dropzone">
              {previewUrl ? (
                mediaType === "image" ? <img src={previewUrl} alt="Preview" /> : <video src={previewUrl} controls />
              ) : (
                <div><UploadCloud size={38} /><strong>Drop or choose a {mediaType}</strong><span>Uploads go directly to Supabase Storage.</span></div>
              )}
              <input type="file" accept={mediaType === "image" ? "image/*" : "video/*"} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          ) : null}

          {mediaType === "embed" ? (
            <div className="embedField">
              <Link2 size={30} />
              <h2>Embed a video</h2>
              <p>YouTube and Vimeo are supported out of the box.</p>
              <input value={embedInput} onChange={(e) => setEmbedInput(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
            </div>
          ) : null}

          {mediaType === "text" ? (
            <div className="textPreview"><span>“</span><p>{caption || "Your gloriously unnecessary hot take appears here."}</p></div>
          ) : null}
        </section>

        <section className="fieldsPanel">
          <label>Title<input maxLength={180} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Write a headline…" /></label>
          <label>Caption<textarea maxLength={1200} rows={5} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add context, punchline or description…" /></label>
          <div className="twoFields">
            <label>Category<select value={category} onChange={(e) => setCategory(e.target.value)}><option>Satire</option><option>Photos</option><option>Screenshots</option><option>Videos</option><option>Hot takes</option><option>Internet archaeology</option></select></label>
            <label>Posted by<input maxLength={60} value={author} onChange={(e) => setAuthor(e.target.value)} /></label>
          </div>
          <label>Original source <span className="optional">optional</span><input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" /></label>
          {error ? <div className="formError">{error}</div> : null}
          <button className="publishButton" disabled={busy || !ready}>{busy ? <><LoaderCircle className="spin" size={19} /> Publishing…</> : "Publish to bheda"}</button>
          <p className="satireNote">Keep satire clearly satirical. Don’t post private information or copyrighted media you don’t have permission to share.</p>
        </section>
      </form>
    </main>
  );
}
