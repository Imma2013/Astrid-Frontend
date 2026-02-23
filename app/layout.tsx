import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mistro Jobs",
  description: "Local-first job discovery with outcome metrics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
