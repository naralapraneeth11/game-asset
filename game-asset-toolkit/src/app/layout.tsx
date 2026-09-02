import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Game Asset Toolkit — Fast local asset pipeline for game developers",
  description:
    "Drop PNGs and get game-ready 1x / 2x / 3x assets, sprite sheets, and more. 100% local processing. Built by a game developer for game developers.",
  keywords: [
    "game asset converter",
    "sprite sheet",
    "1x 2x 3x",
    "Unity assets",
    "pixel art scaler",
    "local image converter",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
