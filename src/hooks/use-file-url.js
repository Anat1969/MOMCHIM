import { useEffect, useState } from "react";
import { getFile, isStoredFileUrl } from "@/api/backend";

/** Resolves a `stored-file:` URL (browser/GitHub storage) into a URL the browser can display. */
export function useFileUrl(url) {
  const [resolved, setResolved] = useState(isStoredFileUrl(url) ? null : url);

  useEffect(() => {
    if (!isStoredFileUrl(url)) { setResolved(url); return; }
    let objectUrl;
    let cancelled = false;
    getFile(url)
      .then(({ blob }) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolved(objectUrl);
      })
      .catch(() => !cancelled && setResolved(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return resolved;
}
