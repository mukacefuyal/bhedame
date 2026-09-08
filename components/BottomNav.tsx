import Link from "next/link";
import { Home, Plus, Search, UserRound } from "lucide-react";

export function BottomNav() {
  return (
    <nav className="bottomNav" aria-label="Mobile navigation">
      <Link href="/"><Home size={22} /><span>Home</span></Link>
      <a href="#search"><Search size={22} /><span>Search</span></a>
      <Link className="bottomCreate" href="/create"><Plus size={24} /></Link>
      <a href="#me"><UserRound size={22} /><span>Me</span></a>
    </nav>
  );
}
