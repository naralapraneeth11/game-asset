import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
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
    template: "%s \u00b7 Game Asset Toolkit",
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

// Runs before React hydrates so the correct theme class is already on
// <html> for first paint — avoids a light/dark flash on load.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    if (resolved === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <div className="min-h-screen bg-background">
            <Sidebar />
            <div className="md:pl-60">
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
