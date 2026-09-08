import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Bheda home">
      <span className="brandMark" aria-hidden="true">🐑</span>
      <span className="brandWord">bheda</span>
      <span className="brandDot">.</span>
    </Link>
  );
}
