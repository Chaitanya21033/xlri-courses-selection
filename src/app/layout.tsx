import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BidScholar — Elective Course Bidding for Business Schools",
  description:
    "Fair, transparent, and auditable elective course allocation for graduate management programmes. Built for institutional rigour and student fairness.",
  keywords: [
    "elective bidding",
    "course allocation",
    "B-school",
    "MBA courses",
    "bid points",
    "MRB",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-slate-900">
        {children}
      </body>
    </html>
  );
}
