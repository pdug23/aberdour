import type { Metadata, Viewport } from "next";
import { Mesh } from "@/components/Mesh";
import { SITE } from "@/lib/media";
import "./globals.css";

export const metadata: Metadata = {
  title: SITE.name,
  description: "Aberdour, Fife. 28 to 31 August 2026.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0e1116",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <Mesh />
        <div className="page">{children}</div>
      </body>
    </html>
  );
}
