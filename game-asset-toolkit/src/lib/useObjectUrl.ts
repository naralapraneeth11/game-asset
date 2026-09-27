"use client";

import { useEffect, useState } from "react";

/** An object URL for `blob` that is revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob?: Blob | null): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) { setUrl(""); return; }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
