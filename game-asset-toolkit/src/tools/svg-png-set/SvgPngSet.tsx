"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

const FRAME_SRC = "/svg-to-png-studio.html?embedded=1";
const THEME_TOKENS = [
  "--background", "--foreground", "--muted", "--muted-foreground",
  "--border", "--accent", "--accent-foreground", "--card", "--hover",
] as const;

/** Reuse the app's self-hosted font faces, without loading its global CSS. */
function appFontRules(): string {
  const faces = new Set<string>();
  const visit = (rules: CSSRuleList, base: string) => {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.FONT_FACE_RULE) {
        let sameOrigin = true;
        const text = rule.cssText.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g,
          (_, source: string) => {
            const url = new URL(source.trim(), base);
            if (url.origin !== window.location.origin) sameOrigin = false;
            return `url("${url.href}")`;
          });
        if (sameOrigin) faces.add(text);
      } else if ("cssRules" in rule) {
        visit((rule as CSSGroupingRule).cssRules, base);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const base = sheet.href || window.location.href;
      if (new URL(base).origin === window.location.origin) visit(sheet.cssRules, base);
    } catch {
      // Inaccessible stylesheets are optional; system fonts remain available.
    }
  }
  return Array.from(faces).join("\n");
}

export default function SvgPngSet() {
  const { resolvedTheme } = useTheme();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const viewportRef = useRef<(() => void) | null>(null);
  const [height, setHeight] = useState(1040);
  const [loadError, setLoadError] = useState(false);

  const syncAppearance = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.getElementById("svg-png-studio")) return;
    doc.documentElement.dataset.embedded = "true";
    doc.documentElement.dataset.theme = resolvedTheme;
    const hostStyles = getComputedStyle(document.documentElement);
    for (const token of THEME_TOKENS) {
      doc.documentElement.style.setProperty(token, hostStyles.getPropertyValue(token));
    }
    doc.documentElement.style.setProperty("--host-font-family", getComputedStyle(document.body).fontFamily);
  }, [resolvedTheme]);

  const onLoad = useCallback(() => {
    cleanupRef.current?.();
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    const root = doc?.getElementById("svg-png-studio");
    if (!frame || !doc || !root) { setLoadError(true); return; }
    setLoadError(false);
    syncAppearance();
    const fontStyle = doc.createElement("style");
    fontStyle.id = "gat-host-fonts";
    fontStyle.textContent = appFontRules();
    doc.getElementById(fontStyle.id)?.remove();
    doc.head.appendChild(fontStyle);

    let disposed = false;
    let animationFrame = 0;
    const updateViewport = () => {
      animationFrame = 0;
      if (disposed) return;
      const rect = frame.getBoundingClientRect();
      // The mobile shell has a 53px sticky top bar; desktop has a fixed sidebar.
      const topBar = window.innerWidth < 768 ? 53 : 0;
      const viewport = window.visualViewport;
      const viewportTop = Math.max(topBar, viewport?.offsetTop || 0);
      const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const visibleTop = Math.min(rect.height, Math.max(0, viewportTop - rect.top));
      const visibleBottom = Math.max(visibleTop, Math.min(rect.height, viewportBottom - rect.top));
      doc.documentElement.style.setProperty("--host-visible-top", `${visibleTop}px`);
      doc.documentElement.style.setProperty("--host-visible-height", `${Math.max(160, visibleBottom - visibleTop)}px`);
      doc.documentElement.style.setProperty("--host-visible-bottom", `${Math.max(0, rect.height - visibleBottom)}px`);
    };
    const scheduleViewport = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(updateViewport);
    };
    const measure = () => {
      if (disposed) return;
      // Intrinsic root height can shrink, unlike the document's scrollHeight.
      // Native dialogs and toasts are out of flow and do not inflate this value.
      const next = Math.max(1, Math.ceil(root.getBoundingClientRect().height));
      setHeight(current => current === next ? current : next);
      scheduleViewport();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    window.addEventListener("scroll", scheduleViewport, { passive: true });
    window.addEventListener("resize", scheduleViewport, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleViewport);
    window.visualViewport?.addEventListener("scroll", scheduleViewport);
    viewportRef.current = scheduleViewport;
    void doc.fonts.ready.then(measure);
    measure();
    updateViewport();
    cleanupRef.current = () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleViewport);
      window.removeEventListener("resize", scheduleViewport);
      window.visualViewport?.removeEventListener("resize", scheduleViewport);
      window.visualViewport?.removeEventListener("scroll", scheduleViewport);
      viewportRef.current = null;
    };
  }, [syncAppearance]);

  useEffect(() => { syncAppearance(); }, [syncAppearance]);
  useEffect(() => { viewportRef.current?.(); }, [height]);
  useEffect(() => {
    // A cached iframe can finish before hydration attaches its load handler.
    if (frameRef.current?.contentDocument?.getElementById("svg-png-studio")) onLoad();
    return () => { cleanupRef.current?.(); };
  }, [onLoad]);

  return (
    <div className="min-w-0">
      {loadError && (
        <p role="status" className="mb-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          The converter could not be loaded.{" "}
          <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => {
            setLoadError(false);
            if (frameRef.current) frameRef.current.src = FRAME_SRC;
          }}>Try again</button>
        </p>
      )}
      <iframe
        ref={frameRef}
        src={FRAME_SRC}
        title="SVG to PNG Set"
        className="block w-full border-0 bg-transparent"
        style={{ height, colorScheme: resolvedTheme }}
        sandbox="allow-scripts allow-same-origin allow-downloads allow-modals"
        loading="eager"
        onLoad={onLoad}
        onError={() => setLoadError(true)}
      />
    </div>
  );
}
