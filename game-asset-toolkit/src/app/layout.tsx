import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Game Asset Toolkit",
    template: "%s · Game Asset Toolkit",
  },
  description:
    "Fast, local-first asset pipeline for game developers. 1x/2x/3x scaling, sprite tools, and more. Files never leave your browser.",
  keywords: [
    "game asset converter",
    "1x 2x 3x converter",
    "sprite sheet",
    "Unity assets",
    "pixel art scaler",
    "local image converter",
    "Retina assets",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-[var(--background)]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
