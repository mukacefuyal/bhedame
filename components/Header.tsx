"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { Bell, Plus, Search } from "lucide-react";
import { Brand } from "./Brand";
import { useAuth } from "./AuthProvider";

export function Header({ search, setSearch, searchInputRef }: {
  search: string;
  setSearch: (value: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}) {
  const { displayName, openAccount } = useAuth();
  return (
    <header className="topbar">
      <Brand />
      <nav className="desktopNav" aria-label="Main navigation">
        <Link className="navPill active" href="/">Home</Link>
        <a className="navPill" href="#fresh">Fresh</a>
      </nav>
      <label className="searchBox" id="search">
        <Search size={19} />
        <input ref={searchInputRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bheda" />
      </label>
      <div className="headerActions">
        <button className="iconButton quiet" aria-label="Notifications"><Bell size={21} /></button>
        <Link className="createButton" href="/create"><Plus size={20} /> <span>Create</span></Link>
        <button className="avatar" title={displayName} aria-label={`Account: ${displayName}`} onClick={openAccount}>B</button>
      </div>
    </header>
  );
}
