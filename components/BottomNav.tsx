"use client";

import Link from "next/link";
import { Home, Plus, Search, Shuffle, UserRound } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function BottomNav({ onHome, onSearch, onRandom }: { onHome: () => void; onSearch: () => void; onRandom: () => void }) {
  const { openAccount } = useAuth();
  return (
    <nav className="bottomNav" aria-label="Mobile navigation">
      <button type="button" onClick={onHome}><Home size={21} /><span>Home</span></button>
      <button type="button" onClick={onSearch}><Search size={21} /><span>Search</span></button>
      <Link className="bottomCreate" href="/create" aria-label="Create post"><Plus size={25} /><span>Create</span></Link>
      <button type="button" onClick={onRandom}><Shuffle size={21} /><span>Random</span></button>
      <button type="button" onClick={openAccount}><UserRound size={21} /><span>Me</span></button>
    </nav>
  );
}
