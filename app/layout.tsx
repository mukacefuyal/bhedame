import type { Metadata } from "next";
import "./globals.css";
import "./layout-fix.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "bheda — herd thinking, meet receipts",
  description: "A visual satire board for screenshots, photos, video, audio and posts calling out herd-thinking and bad ideas.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://bheda.me"),
  openGraph: {
    title: "bheda",
    description: "Herd thinking, meet receipts.",
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
