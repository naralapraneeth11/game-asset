import { ImageResponse } from "next/og";
import { LOGO_PATH } from "@/components/shell/Logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon. iOS rounds the corners itself, so the tile is square. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FF6B00" }}>
        <svg width="132" height="132" viewBox="0 0 32 32">
          <path d={LOGO_PATH} fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
