import type { Metadata } from "next";
import "./globals.css";
import "./layout-fix.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "bheda — the internet, slightly roasted",
  description: "A visual satire board for photos, screenshots, video embeds and posts.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://bheda.me"),
  openGraph: {
    title: "bheda",
    description: "The internet, slightly roasted.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
