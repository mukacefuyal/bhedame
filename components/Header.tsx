"use client";

import Link from "next/link";
import { Bell, Plus, Search } from "lucide-react";
import { Brand } from "./Brand";

export function Header({ search, setSearch }: { search: string; setSearch: (value: string) => void }) {
  return (
    <header className="topbar">
      <Brand />
      <nav className="desktopNav" aria-label="Main navigation">
        <Link className="navPill active" href="/">Home</Link>
        <a className="navPill" href="#fresh">Fresh</a>
      </nav>
      <label className="searchBox">
        <Search size={19} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bheda" />
      </label>
      <div className="headerActions">
        <button className="iconButton quiet" aria-label="Notifications"><Bell size={21} /></button>
        <Link className="createButton" href="/create"><Plus size={20} /> <span>Create</span></Link>
        <div className="avatar" title="Guest sheep">B</div>
      </div>
    </header>
  );
}
