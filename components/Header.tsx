"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { Bell, Languages, Plus, Search, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "./Brand";
import { useAuth } from "./AuthProvider";
import { useI18n } from "./I18nProvider";
import { authFetch } from "@/lib/authFetch";
import { getVisitorId } from "@/lib/visitor";

type NotificationItem = { id: string; type: "comment" | "reaction"; text: string; post_id: string; created_at: string };

export function Header({ search, setSearch, searchInputRef }: {
  search: string;
  setSearch: (value: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}) {
  const { displayName, openAccount, ready } = useAuth();
  const { t, toggleLanguage } = useI18n();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [seenAt, setSeenAt] = useState("");

  useEffect(() => {
    setSeenAt(localStorage.getItem("bheda-notifications-seen") || "");
  }, []);

  useEffect(() => {
    if (!ready) return;
    authFetch("/api/notifications", { headers: { "x-visitor-id": getVisitorId() } })
      .then((r) => r.json())
      .then((data) => Array.isArray(data.notifications) && setNotifications(data.notifications))
      .catch(() => {});
  }, [ready]);

  const unread = notifications.filter((item) => !seenAt || item.created_at > seenAt).length;

  function markRead() {
    const now = new Date().toISOString();
    localStorage.setItem("bheda-notifications-seen", now);
    setSeenAt(now);
  }

  return (
    <header className="topbar">
      <Brand />
      <nav className="desktopNav" aria-label="Main navigation">
        <Link className="navPill active" href="/">{t("home")}</Link>
        <a className="navPill" href="#fresh">{t("fresh")}</a>
      </nav>
      <label className="searchBox" id="search">
        <Search size={19} />
        <input ref={searchInputRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} />
      </label>
      <div className="headerActions">
        <button className="iconButton quiet languageButton" aria-label="Switch language" title={t("language")} onClick={toggleLanguage}><Languages size={20} /></button>
        <div className="notificationWrap">
          <button className="iconButton quiet" aria-label={t("notifications")} onClick={() => setNotificationsOpen((v) => !v)}>
            <Bell size={21} />{unread > 0 ? <span className="notificationBadge">{Math.min(unread, 9)}</span> : null}
          </button>
          {notificationsOpen ? (
            <div className="notificationPanel">
              <div className="notificationHead"><strong>{t("notifications")}</strong><button onClick={() => setNotificationsOpen(false)}><X size={17} /></button></div>
              {notifications.length ? notifications.slice(0, 12).map((item) => (
                <Link key={item.id} href={`/p/${item.post_id}`} className="notificationItem" onClick={() => { markRead(); setNotificationsOpen(false); }}>
                  <span className={item.type === "comment" ? "notificationIcon comment" : "notificationIcon reaction"}>{item.type === "comment" ? "💬" : "↑"}</span>
                  <span>{item.text}</span>
                </Link>
              )) : <div className="notificationEmpty">{t("noNotifications")}</div>}
              {notifications.length ? <button className="markRead" onClick={markRead}>{t("markRead")}</button> : null}
            </div>
          ) : null}
        </div>
        <Link className="createButton" href="/create"><Plus size={20} /> <span>{t("create")}</span></Link>
        <button className="avatar" title={displayName} aria-label={`Account: ${displayName}`} onClick={openAccount}>B</button>
      </div>
    </header>
  );
}
