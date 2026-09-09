"use client";

import { FormEvent, Fragment, useMemo, useState } from "react";
import { ArrowLeft, AudioLines, Image as ImageIcon, Link2, LoaderCircle, Type, UploadCloud, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { normaliseEmbedUrl } from "@/lib/embed";
import type { MediaType } from "@/lib/types";
import { getVisitorId } from "@/lib/visitor";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "./AuthProvider";
import { useI18n } from "./I18nProvider";

const tabs: { value: MediaType; label: string; icon: typeof ImageIcon }[] = [
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "video", label: "Video", icon: Video },
  { value: "audio", label: "Audio", icon: AudioLines },
  { value: "embed", label: "Embed", icon: Link2 },
  { value: "text", label: "Text", icon: Type },
];

const categories = ["Satire", "Politics", "Society", "Photos", "Screenshots", "Videos", "Audio", "Hot takes", "Internet archaeology"];

function DraftRichText({ text }: { text: string }) {
  if (!text.trim()) return null;
  const parts = text.split(/((?:^|\s)[#@][\p{L}\p{N}_.-]+(?=\s|$|[.,!?;:]))/gu);
  return <div className="liveTokenPreview">{parts.map((part, index) => {
    const match = part.match(/^(\s*)([#@][\p{L}\p{N}_.-]+)$/u);
    if (!match) return <Fragment key={index}>{part}</Fragment>;
    return <Fragment key={index}>{match[1]}<strong>{match[2]}</strong></Fragment>;
  })}</div>;
}

export function PostComposer() {
  const router = useRouter();
  const { displayName, ready, openAccount } = useAuth();
  const { t } = useI18n();
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [file, setFile] = useState<File | null>(null);
  const [embedInput, setEmbedInput] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Satire");
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);

  async function uploadSelectedFile() {
    if (!file) return null;
    const prep = await authFetch("/api/uploads/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size, visitorId: getVisitorId() }),
    });
    const details = await prep.json();
    if (!prep.ok) throw new Error(details.error || "Could not prepare upload.");

    const client = getSupabaseBrowser();
    if (!client) throw new Error("Upload service is not available right now.");
    const { error: uploadError } = await client.storage
      .from("media")
      .uploadToSignedUrl(details.path, details.token, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    return details.publicUrl as string;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Give the post a title.");
    if (!categories.includes(category)) return setError("Choose a category from the list.");
    if (["image", "video", "audio"].includes(mediaType) && !file) return setError(`Choose an ${mediaType === "image" ? "image" : mediaType} file to upload.`);
    if (mediaType === "embed" && !normaliseEmbedUrl(embedInput)) return setError("Paste a valid YouTube or Vimeo link.");

    setBusy(true);
    try {
      const mediaUrl = ["image", "video", "audio"].includes(mediaType) ? await uploadSelectedFile() : null;
      const embedUrl = mediaType === "embed" ? normaliseEmbedUrl(embedInput) : null;
      const res = await authFetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), caption: caption.trim(), category, mediaType,
          mediaUrl, embedUrl, sourceUrl: sourceUrl.trim(), visitorId: getVisitorId(),
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

  const isUpload = ["image", "video", "audio"].includes(mediaType);

  return (
    <main className="composerPage">
      <div className="composerHeader">
        <Link href="/" className="iconButton"><ArrowLeft size={20} /></Link>
        <div><span className="kicker">{t("newPost")}</span><h1>{t("receiptTitle")}</h1></div>
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

          {isUpload ? (
            <label className="dropzone">
              {previewUrl ? (
                mediaType === "image" ? <img src={previewUrl} alt="Preview" />
                  : mediaType === "video" ? <video src={previewUrl} controls />
                    : <div className="audioPreview"><AudioLines size={54} /><strong>{file?.name}</strong><audio src={previewUrl} controls /></div>
              ) : (
                <div><UploadCloud size={38} /><strong>Drop or choose {mediaType === "image" ? "an image" : `a ${mediaType}`}</strong><span>Your media will be uploaded securely.</span></div>
              )}
              <input
                type="file"
                accept={mediaType === "image" ? "image/*" : mediaType === "video" ? "video/*" : "audio/*"}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          ) : null}

          {mediaType === "embed" ? (
            <div className="embedField">
              <Link2 size={30} />
              <h2>Embed a video</h2>
              <p>YouTube and Vimeo links work here.</p>
              <input value={embedInput} onChange={(e) => setEmbedInput(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
            </div>
          ) : null}

          {mediaType === "text" ? (
            <div className="textPreview"><span>“</span><p>{caption || "Explain the bheda moment, add context, then let people decide."}</p></div>
          ) : null}
        </section>

        <section className="fieldsPanel">
          <div className="postingAs"><span>{t("postingAs")}</span><strong>{displayName}</strong></div>
          <label>{t("title")}<input maxLength={180} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is the bheda moment?" /></label>
          <label>{t("contextCaption")}
            <textarea maxLength={1200} rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Explain what happened and why it matters. Use #hashtags and @mentions when useful…" />
            <DraftRichText text={caption} />
            <span className="fieldHint">Complete a #hashtag or @mention and type a space to preview it in bold colour. Published tags stay searchable.</span>
          </label>
          <label className="categoryCombo">{t("category")}
            <input list="bheda-categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Search or choose category" />
            <datalist id="bheda-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist>
          </label>
          <label>{t("source")} <span className="optional">{t("recommended")}</span><input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" /></label>
          {error ? <div className="formError">{error}</div> : null}
          <button className="publishButton" disabled={busy || !ready}>{busy ? <><LoaderCircle className="spin" size={19} /> {t("publishing")}</> : t("publish")}</button>
          <p className="satireNote">Bheda is for calling out herd-thinking, bad public claims and absurd ideas. Add context, avoid doxxing, and critique conduct or ideas rather than protected traits.</p>
        </section>
      </form>
    </main>
  );
}
