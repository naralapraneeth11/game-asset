import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { site } from "@/lib/site";
import { homeSeo } from "@/lib/seo-copy";
import { ogImage, siteOrigin } from "@/lib/seo";
import { TopBar } from "@/components/shell/TopBar";
import { Footer } from "@/components/shell/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteOrigin(),
  title: {
    default: homeSeo.title,
    template: `%s | ${site.name}`,
  },
  description: homeSeo.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
    title: homeSeo.title,
    description: homeSeo.description,
    images: [ogImage("home", site.name)],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edece8" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b1a" },
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
      <body className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col font-sans antialiased`}>
        <ThemeProvider>
          <a
            href="#main"
            className="fixed left-3 top-3 z-[60] -translate-y-[200%] rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground focus:translate-y-0"
          >
            Skip to content
          </a>
          <TopBar />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
