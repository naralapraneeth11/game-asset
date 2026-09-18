import type { Metadata } from "next";
import VideoEditor from "@/tools/video-editor/VideoEditor";

const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
function siteOrigin(): URL | undefined {
  if (!configured) return undefined;
  try {
    const url = new URL(configured.includes("://") ? configured : `https://${configured}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return new URL(url.origin);
  } catch {
    return undefined;
  }
}

const origin = siteOrigin();

export const metadata: Metadata = {
  title: "Video Editor & Converter — Free, Private, Online",
  description:
    "Trim, resize, edit, compress and convert video locally in your browser. MP4, WebM, GIF and more. Files never leave your device.",
  keywords: [
    "video editor",
    "video converter",
    "compress video",
    "trim video",
    "mp4",
    "webm",
    "gif",
    "local",
    "private",
  ],
  ...(origin
    ? {
        metadataBase: origin,
        alternates: { canonical: new URL("/tools/video-editor", origin) },
      }
    : {}),
};

export default function Page() {
  return <VideoEditor />;
}
