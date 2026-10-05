import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Badminton Academy | Book Badminton Courts",
  description:
    "Fast, effortless slot booking for badminton courts and academies. No app download or account required.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { db } from "@/lib/db";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Try to load business theme
  let themeClass = "theme-default";
  try {
    const business = await db.business.findFirst();
    if (business && business.festiveTheme) {
      themeClass = `theme-${business.festiveTheme}`;
    }
  } catch (e) {
    // Ignore db error during build or if uninitialized
  }

  return (
    <html lang="en" className={`h-full ${geistSans.variable} ${geistMono.variable}`}>
      <body className={`h-full antialiased bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 ${themeClass}`}>
        {children}
      </body>
    </html>
  );
}
