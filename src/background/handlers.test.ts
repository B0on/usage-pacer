import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { FetchResult } from "../cursor/client";
import type { UsageSnapshot } from "../domain/types";
import { PACE_GREY } from "../toolbar/badge";
import { STALE_CACHE_MS } from "../toolbar/stale";
import {
  handleBackgroundMessage,
  handleGetState,
  handleSetBadgeMode,
  refreshAndApply,
  registerRefreshAlarm,
  type BackgroundDeps,
} from "./handlers";
import {
  REFRESH_ALARM_NAME,
  REFRESH_ALARM_PERIOD_MINUTES,
} from "./messages";

const CYCLE_START = "2026-07-18T10:36:57.000Z";
const CYCLE_END = "2026-08-18T10:36:57.000Z";

function makeSnapshot(overrides: Partial<UsageSnapshot> = {}): UsageSnapshot {
  return {
    billingCycleStart: CYCLE_START,
    billingCycleEnd: CYCLE_END,
    totalPercentUsed: 66.107,
    onDemand: { enabled: false, used: 0 },
    breakdown: { included: 2000, bonus: 20807, total: 22807 },
    autoPercentUsed: 76.023,
    apiPercentUsed: 0,
    membershipType: "pro",
    fetchedAt: Date.parse("2026-08-14T10:00:00.000Z"),
    ...overrides,
  };
}

function createMemoryStorage(initial: Record<string, unknown> = {}) {
  const data = { ...initial };

  return {
    get: vi.fn(async (keys: string[] | Record<string, unknown>) => {
      if (Array.isArray(keys)) {
        return Object.fromEntries(keys.map((key) => [key, data[key]]));
      }
      return { ...data, ...keys };
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(data, items);
    }),
    data,
  };
}

function createDeps(
  overrides: Partial<BackgroundDeps> & {
    storageData?: Record<string, unknown>;
    signedOut?: boolean;
  } = {},
): BackgroundDeps & {
  fetchUsageSummary: Mock<() => Promise<FetchResult>>;
  applyToolbar: Mock<BackgroundDeps["applyToolbar"]>;
} {
  const storage = createMemoryStorage(overrides.storageData);
  const setBadgeText = vi.fn().mockResolvedValue(undefined);
  const setBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined);
  const setIcon = vi.fn().mockResolvedValue(undefined);
  const applyToolbar = vi.fn<BackgroundDeps["applyToolbar"]>().mockResolvedValue(undefined);
  const fetchUsageSummary = vi.fn<() => Promise<FetchResult>>();
  const nowMs = vi.fn(() => Date.parse("2026-08-14T12:00:00.000Z"));

  const {
    storageData: _storageData,
    signedOut,
    fetchUsageSummary: _fetchOverride,
    applyToolbar: _applyOverride,
    ...rest
  } = overrides;

  return {
    storage,
    getCookie: vi.fn(async () => (signedOut ? null : ({} as chrome.cookies.Cookie))),
    fetchUsageSummary,
    applyToolbar,
    nowMs,
    action: { setIcon, setBadgeText, setBadgeBackgroundColor },
    ...rest,
  };
}

describe("registerRefreshAlarm", () => {
  it("registers a 15-minute refresh alarm on install", () => {
    const create = vi.fn().mockResolvedValue(undefined);

    registerRefreshAlarm({ create });

    expect(create).toHaveBeenCalledWith(REFRESH_ALARM_NAME, {
      periodInMinutes: REFRESH_ALARM_PERIOD_MINUTES,
    });
    expect(REFRESH_ALARM_PERIOD_MINUTES).toBe(15);
  });
});

describe("background message handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getState returns signedOut from cookie presence and hides stale snapshot", async () => {
    const fetchedAt = 1_000_000;
    const nowMs = fetchedAt + STALE_CACHE_MS;
    const deps = createDeps({
      signedOut: true,
      storageData: {
        snapshot: makeSnapshot({ fetchedAt }),
        badgeMode: "remaining",
        lastError: null,
      },
      nowMs: () => nowMs,
    });

    const state = await handleGetState(deps);

    expect(state.signedOut).toBe(true);
    expect(state.snapshot).toBeNull();
    expect(state.badgeMode).toBe("remaining");
    expect(deps.fetchUsageSummary).not.toHaveBeenCalled();
  });

  it("refresh success updates snapshot fetchedAt and applies toolbar", async () => {
    const oldSnapshot = makeSnapshot({ fetchedAt: 1_000 });
    const newFetchedAt = Date.parse("2026-08-14T12:34:56.000Z");
    const newSnapshot = makeSnapshot({ fetchedAt: newFetchedAt });
    const deps = createDeps({
      signedOut: false,
      storageData: {
        snapshot: oldSnapshot,
        badgeMode: "used",
        lastError: "old error",
      },
    });

    deps.fetchUsageSummary.mockResolvedValue({
      kind: "success",
      snapshot: newSnapshot,
    });

    const state = await refreshAndApply(deps);

    expect(deps.fetchUsageSummary).toHaveBeenCalledTimes(1);
    expect(state.snapshot?.fetchedAt).toBe(newFetchedAt);
    expect(state.lastError).toBeNull();
    expect(deps.applyToolbar).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: newSnapshot,
        signedOut: false,
        badgeMode: "used",
      }),
      deps.action,
    );
  });

  it("setBadgeMode persists mode, applies toolbar, and does not fetch", async () => {
    const snapshot = makeSnapshot();
    const deps = createDeps({
      signedOut: false,
      storageData: {
        snapshot,
        badgeMode: "remaining",
        lastError: null,
      },
    });

    const state = await handleSetBadgeMode("delta", deps);

    expect(deps.fetchUsageSummary).not.toHaveBeenCalled();
    expect(state.badgeMode).toBe("delta");
    expect(deps.applyToolbar).toHaveBeenCalledWith(
      expect.objectContaining({
        badgeMode: "delta",
        snapshot,
      }),
      deps.action,
    );
  });

  it("missing cookie with stale cache paints ASCII dash via applyToolbar", async () => {
    const fetchedAt = 1_000_000;
    const nowMs = fetchedAt + STALE_CACHE_MS;
    const deps = createDeps({
      signedOut: true,
      storageData: {
        snapshot: makeSnapshot({ fetchedAt }),
        badgeMode: "remaining",
        lastError: null,
      },
      nowMs: () => nowMs,
    });

    deps.applyToolbar.mockImplementation(async (input, action) => {
      const { resolveBadgePresentation } = await import("../toolbar/badge");
      const { computePacing } = await import("../domain/pacing");
      const { isSignedOutCacheStale, hasUsableSnapshot } = await import(
        "../toolbar/stale"
      );

      const stale = isSignedOutCacheStale(
        input.signedOut,
        input.snapshot?.fetchedAt ?? null,
        input.nowMs,
      );
      const usable = hasUsableSnapshot(
        input.snapshot,
        input.signedOut,
        input.nowMs,
      );
      const viewModel =
        usable && input.snapshot
          ? computePacing(input.snapshot, input.nowMs)
          : null;
      const badge = resolveBadgePresentation({
        viewModel,
        signedOut: input.signedOut,
        stale,
        badgeMode: input.badgeMode,
      });
      await action?.setBadgeText({ text: badge.text });
      await action?.setBadgeBackgroundColor({ color: badge.backgroundColor });
    });

    await handleSetBadgeMode("remaining", deps);

    expect(deps.action?.setBadgeText).toHaveBeenCalledWith({ text: "-" });
    expect(deps.action?.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: PACE_GREY,
    });
  });

  it("handleBackgroundMessage routes setBadgeMode and refresh", async () => {
    const deps = createDeps({
      signedOut: false,
      storageData: {
        snapshot: makeSnapshot(),
        badgeMode: "remaining",
        lastError: null,
      },
    });
    deps.fetchUsageSummary.mockResolvedValue({
      kind: "success",
      snapshot: makeSnapshot({ fetchedAt: 9_999 }),
    });

    const modeState = await handleBackgroundMessage(
      { type: "setBadgeMode", mode: "used" },
      deps,
    );
    expect(modeState?.badgeMode).toBe("used");

    const refreshState = await handleBackgroundMessage({ type: "refresh" }, deps);
    expect(refreshState?.snapshot?.fetchedAt).toBe(9_999);
  });

  it("treats fetch signed_out as signedOut even when a cookie is still present", async () => {
    const snapshot = makeSnapshot();
    const deps = createDeps({
      signedOut: false,
      storageData: {
        snapshot,
        badgeMode: "remaining",
        lastError: null,
      },
    });
    deps.fetchUsageSummary.mockResolvedValue({ kind: "signed_out" });

    const state = await refreshAndApply(deps);

    expect(state.signedOut).toBe(true);
    expect(state.snapshot).toEqual(snapshot);
    expect(deps.applyToolbar).toHaveBeenCalledWith(
      expect.objectContaining({ signedOut: true, snapshot }),
      deps.action,
    );
  });
});
