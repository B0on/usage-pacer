import { useCallback, useEffect, useState } from "react";
import type { BadgeMode } from "../domain/types";
import type { PopupState } from "../background/messages";
import { sendBackgroundMessage } from "./messages";
import { PopupView } from "./PopupView";

const CURSOR_URL = "https://cursor.com";

function openCursorSignIn(): void {
  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    void chrome.tabs.create({ url: CURSOR_URL });
    return;
  }
  window.open(CURSOR_URL, "_blank", "noopener,noreferrer");
}

function applyPopupState(state: PopupState, setState: (state: PopupState) => void): void {
  setState(state);
}

export function App() {
  const [state, setState] = useState<PopupState>({
    snapshot: null,
    signedOut: true,
    lastError: null,
    badgeMode: "remaining",
  });
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const initial = await sendBackgroundMessage({ type: "getState" });
        if (!cancelled) {
          applyPopupState(initial, setState);
          setNowMs(Date.now());
        }

        const refreshed = await sendBackgroundMessage({ type: "refresh" });
        if (!cancelled) {
          applyPopupState(refreshed, setState);
          setNowMs(Date.now());
        }
      } catch {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            lastError: current.lastError ?? "Could not reach the extension background",
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh = useCallback((): void => {
    void (async () => {
      try {
        const refreshed = await sendBackgroundMessage({ type: "refresh" });
        applyPopupState(refreshed, setState);
        setNowMs(Date.now());
      } catch {
        setState((current) => ({
          ...current,
          lastError: current.lastError ?? "Refresh failed",
        }));
      }
    })();
  }, []);

  const handleBadgeModeChange = useCallback((mode: BadgeMode): void => {
    void (async () => {
      try {
        const updated = await sendBackgroundMessage({ type: "setBadgeMode", mode });
        applyPopupState(updated, setState);
        setNowMs(Date.now());
      } catch {
        setState((current) => ({
          ...current,
          lastError: current.lastError ?? "Could not update badge mode",
        }));
      }
    })();
  }, []);

  return (
    <PopupView
      snapshot={state.snapshot}
      signedOut={state.signedOut}
      lastError={state.lastError}
      badgeMode={state.badgeMode}
      nowMs={nowMs}
      onRefresh={handleRefresh}
      onSignIn={openCursorSignIn}
      onBadgeModeChange={handleBadgeModeChange}
    />
  );
}
