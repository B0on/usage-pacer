import { useEffect, useState } from "react";
import { hasSessionCookie } from "../cursor/client";
import type { UsageSnapshot } from "../domain/types";
import { getCache } from "../storage/cache";
import { PopupView } from "./PopupView";

const CURSOR_URL = "https://cursor.com";

function openCursorSignIn(): void {
  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    void chrome.tabs.create({ url: CURSOR_URL });
    return;
  }
  window.open(CURSOR_URL, "_blank", "noopener,noreferrer");
}

export function App() {
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  const [signedOut, setSignedOut] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const cache = await getCache();
      let isSignedOut = cache.snapshot === null;

      try {
        isSignedOut = !(await hasSessionCookie());
      } catch {
        isSignedOut = cache.snapshot === null;
      }

      if (!cancelled) {
        setSnapshot(cache.snapshot);
        setSignedOut(isSignedOut);
        setLastError(cache.lastError);
        setNowMs(Date.now());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh = (): void => {
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      void chrome.runtime.sendMessage({ type: "refresh" });
    }
  };

  return (
    <PopupView
      snapshot={snapshot}
      signedOut={signedOut}
      lastError={lastError}
      nowMs={nowMs}
      onRefresh={handleRefresh}
      onSignIn={openCursorSignIn}
    />
  );
}
