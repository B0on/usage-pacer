import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_REFRESH_INTERVAL,
  type BadgeMode,
  type RefreshInterval,
} from "../domain/types";
import type { PopupState } from "../background/messages";
import { sendBackgroundMessage } from "./messages";
import { PopupView } from "./PopupView";

const CURSOR_URL = "https://cursor.com";
const USAGE_DASHBOARD_URL = "https://cursor.com/dashboard/usage";

function openUrl(url: string): void {
  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    void chrome.tabs.create({ url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function App() {
  const [state, setState] = useState<PopupState>({
    snapshot: null,
    signedOut: false,
    lastError: null,
    badgeMode: "remaining",
    refreshInterval: DEFAULT_REFRESH_INTERVAL,
  });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const initial = await sendBackgroundMessage({ type: "getState" });
        if (!cancelled) {
          setState(initial);
          setNowMs(Date.now());
          setHydrated(true);
        }

        const refreshed = await sendBackgroundMessage({ type: "refresh" });
        if (!cancelled) {
          setState(refreshed);
          setNowMs(Date.now());
        }
      } catch {
        if (!cancelled) {
          setHydrated(true);
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
        setState(refreshed);
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
        setState(updated);
        setNowMs(Date.now());
      } catch {
        setState((current) => ({
          ...current,
          lastError: current.lastError ?? "Could not update badge mode",
        }));
      }
    })();
  }, []);

  const handleRefreshIntervalChange = useCallback((interval: RefreshInterval): void => {
    void (async () => {
      try {
        const updated = await sendBackgroundMessage({
          type: "setRefreshInterval",
          interval,
        });
        setState(updated);
        setNowMs(Date.now());
      } catch {
        setState((current) => ({
          ...current,
          lastError: current.lastError ?? "Could not update sync interval",
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
      refreshInterval={state.refreshInterval}
      nowMs={nowMs}
      hydrated={hydrated}
      onRefresh={handleRefresh}
      onSignIn={() => openUrl(CURSOR_URL)}
      onOpenUsage={() => openUrl(USAGE_DASHBOARD_URL)}
      onBadgeModeChange={handleBadgeModeChange}
      onRefreshIntervalChange={handleRefreshIntervalChange}
    />
  );
}
