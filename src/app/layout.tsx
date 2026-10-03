import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
    title: { default: `${s.clubName} — Young leaders in service, Kampala`, template: `%s · ${s.clubName}` },
    description: s.description,
    openGraph: { type: "website", siteName: s.clubName, locale: "en_UG" },
    twitter: { card: "summary_large_image", site: "@kanosug" },
    alternates: { canonical: "/" },
  };
}

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#17458f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-UG">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
