import { describe, expect, it, vi, beforeEach } from "vitest";
import { computePacing } from "../domain/pacing";
import { MS_PER_DAY, type UsageSnapshot } from "../domain/types";
import {
  PACE_BADGE_COLORS,
  PACE_GREY,
  resolveBadgePresentation,
} from "./badge";
import { applyToolbar } from "./apply";
import {
  buildElapsedRingIcon,
  elapsedSweepRadians,
  RING_FILL_COLOR,
  setElapsedRingIcon,
} from "./icon";
import {
  hasUsableSnapshot,
  isSignedOutCacheStale,
  STALE_CACHE_MS,
} from "./stale";

vi.mock("./icon", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./icon")>();
  return {
    ...actual,
    setElapsedRingIcon: vi.fn().mockResolvedValue(undefined),
  };
});

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
  } as UsageSnapshot;
}

function nowAtElapsedFraction(fraction: number): number {
  const start = Date.parse(CYCLE_START);
  const end = Date.parse(CYCLE_END);
  const totalDays = (end - start) / MS_PER_DAY;
  return start + totalDays * fraction * MS_PER_DAY;
}

function screenshotFixtureVm() {
  return computePacing(
    makeSnapshot({ totalPercentUsed: 66.107 }),
    nowAtElapsedFraction(0.924),
  );
}

describe("stale cache helpers", () => {
  const fetchedAt = 1_000_000;

  it("is not stale when signed in", () => {
    expect(isSignedOutCacheStale(false, fetchedAt, fetchedAt + STALE_CACHE_MS)).toBe(
      false,
    );
  });

  it("is stale when signed out with no fetchedAt", () => {
    expect(isSignedOutCacheStale(true, null, fetchedAt)).toBe(true);
  });

  it("is stale when signed out and cache is 24h or older", () => {
    expect(
      isSignedOutCacheStale(true, fetchedAt, fetchedAt + STALE_CACHE_MS),
    ).toBe(true);
    expect(
      isSignedOutCacheStale(true, fetchedAt, fetchedAt + STALE_CACHE_MS + 1),
    ).toBe(true);
  });

  it("is fresh when signed out and cache is younger than 24h", () => {
    expect(
      isSignedOutCacheStale(true, fetchedAt, fetchedAt + STALE_CACHE_MS - 1),
    ).toBe(false);
  });

  it("hasUsableSnapshot follows signed-out stale rule", () => {
    const snapshot = makeSnapshot({ fetchedAt });
    expect(hasUsableSnapshot(snapshot, false, fetchedAt)).toBe(true);
    expect(hasUsableSnapshot(null, true, fetchedAt)).toBe(false);
    expect(
      hasUsableSnapshot(snapshot, true, fetchedAt + STALE_CACHE_MS - 1),
    ).toBe(true);
    expect(
      hasUsableSnapshot(snapshot, true, fetchedAt + STALE_CACHE_MS),
    ).toBe(false);
  });
});

describe("elapsedSweepRadians", () => {
  it("maps 92.4% to nearly a full circle", () => {
    const sweep = elapsedSweepRadians(92.4);
    expect(sweep).toBeCloseTo(0.924 * 2 * Math.PI, 5);
    expect(sweep).toBeGreaterThan(2 * Math.PI * 0.9);
    expect(sweep).toBeLessThan(2 * Math.PI);
  });

  it("clamps below zero and above 100", () => {
    expect(elapsedSweepRadians(-10)).toBe(0);
    expect(elapsedSweepRadians(150)).toBeCloseTo(2 * Math.PI, 5);
  });
});

describe("buildElapsedRingIcon", () => {
  it("uses product green fill, not pace red", () => {
    expect(RING_FILL_COLOR).toBe("#3d9a4a");
    expect(RING_FILL_COLOR).not.toBe(PACE_BADGE_COLORS.red);
  });

  it.skipIf(typeof OffscreenCanvas === "undefined")(
    "returns ImageData with non-zero alpha for track and fill",
    () => {
      const icons = buildElapsedRingIcon(92.4, { showFill: true });
      for (const size of [16, 32]) {
        const { data } = icons[size];
        const hasAlpha = Array.from(data).some(
          (_, index) => index % 4 === 3 && data[index] > 0,
        );
        expect(hasAlpha).toBe(true);
      }
    },
  );

  it.skipIf(typeof OffscreenCanvas === "undefined")(
    "draws track only when fill is disabled",
    () => {
      const withFill = buildElapsedRingIcon(50, { showFill: true });
      const trackOnly = buildElapsedRingIcon(50, { showFill: false });
      const fillPixels = countNonTransparentPixels(withFill[16]);
      const trackPixels = countNonTransparentPixels(trackOnly[16]);
      expect(trackPixels).toBeGreaterThan(0);
      expect(fillPixels).toBeGreaterThan(trackPixels);
    },
  );
});

function countNonTransparentPixels(image: ImageData): number {
  let count = 0;
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] > 0) {
      count += 1;
    }
  }
  return count;
}

describe("resolveBadgePresentation", () => {
  const vm = screenshotFixtureVm();

  it.each([
    { mode: "remaining" as const, text: "34" },
    { mode: "delta" as const, text: "-26" },
    { mode: "used" as const, text: "66" },
  ])("screenshot fixture mode $mode → $text", ({ mode, text }) => {
    const badge = resolveBadgePresentation({
      viewModel: vm,
      signedOut: false,
      stale: false,
      badgeMode: mode,
    });
    expect(badge.text).toBe(text);
    expect(badge.backgroundColor).toBe(PACE_BADGE_COLORS.green);
  });

  it("shows stale signed-out badge as ASCII dash on grey", () => {
    const badge = resolveBadgePresentation({
      viewModel: vm,
      signedOut: true,
      stale: true,
      badgeMode: "remaining",
    });
    expect(badge.text).toBe("-");
    expect(badge.backgroundColor).toBe(PACE_GREY);
  });

  it("shows fresh signed-out badge with last-known text on grey", () => {
    const badge = resolveBadgePresentation({
      viewModel: vm,
      signedOut: true,
      stale: false,
      badgeMode: "remaining",
    });
    expect(badge.text).toBe("34");
    expect(badge.backgroundColor).toBe(PACE_GREY);
  });

  it("uses pace color for signed-in badge, not remaining %", () => {
    const badge = resolveBadgePresentation({
      viewModel: vm,
      signedOut: false,
      stale: false,
      badgeMode: "remaining",
    });
    expect(badge.backgroundColor).toBe(PACE_BADGE_COLORS.green);
    expect(badge.backgroundColor).not.toBe(PACE_GREY);
  });
});

describe("applyToolbar", () => {
  beforeEach(() => {
    vi.mocked(setElapsedRingIcon).mockClear();
  });

  it("sets icon and badge via chrome.action", async () => {
    const setIcon = vi.fn().mockResolvedValue(undefined);
    const setBadgeText = vi.fn().mockResolvedValue(undefined);
    const setBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined);
    const action = { setIcon, setBadgeText, setBadgeBackgroundColor };

    const snapshot = makeSnapshot();
    const nowMs = nowAtElapsedFraction(0.924);

    await applyToolbar(
      {
        snapshot,
        signedOut: false,
        badgeMode: "remaining",
        nowMs,
      },
      action,
    );

    expect(setElapsedRingIcon).toHaveBeenCalledWith(
      expect.closeTo(92.4, 0),
      { showFill: true },
      action,
    );

    expect(setBadgeText).toHaveBeenCalledWith({ text: "34" });
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: PACE_BADGE_COLORS.green,
    });
  });

  it("paints empty ring and ASCII dash when signed out and stale", async () => {
    const setBadgeText = vi.fn().mockResolvedValue(undefined);
    const setBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined);
    const action = {
      setIcon: vi.fn().mockResolvedValue(undefined),
      setBadgeText,
      setBadgeBackgroundColor,
    };

    const fetchedAt = 1_000_000;
    const nowMs = fetchedAt + STALE_CACHE_MS;

    await applyToolbar(
      {
        snapshot: makeSnapshot({ fetchedAt }),
        signedOut: true,
        badgeMode: "used",
        nowMs,
      },
      action,
    );

    expect(setElapsedRingIcon).toHaveBeenCalledWith(0, { showFill: false }, action);
    expect(setBadgeText).toHaveBeenCalledWith({ text: "-" });
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith({ color: PACE_GREY });
  });

  it("keeps last-known badge when signed out with fresh cache", async () => {
    const setBadgeText = vi.fn().mockResolvedValue(undefined);
    const setBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined);
    const action = {
      setIcon: vi.fn().mockResolvedValue(undefined),
      setBadgeText,
      setBadgeBackgroundColor,
    };

    const nowMs = nowAtElapsedFraction(0.924);
    const fetchedAt = nowMs - 60_000;

    await applyToolbar(
      {
        snapshot: makeSnapshot({ fetchedAt }),
        signedOut: true,
        badgeMode: "delta",
        nowMs,
      },
      action,
    );

    expect(setBadgeText).toHaveBeenCalledWith({ text: "-26" });
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith({ color: PACE_GREY });
    expect(setElapsedRingIcon).toHaveBeenCalledWith(
      expect.closeTo(92.4, 0),
      { showFill: true },
      action,
    );
  });

  it("still sets the badge when ring drawing throws", async () => {
    vi.mocked(setElapsedRingIcon).mockRejectedValueOnce(new Error("no canvas"));
    const setBadgeText = vi.fn().mockResolvedValue(undefined);
    const setBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined);
    const action = {
      setIcon: vi.fn().mockResolvedValue(undefined),
      setBadgeText,
      setBadgeBackgroundColor,
    };

    await applyToolbar(
      {
        snapshot: makeSnapshot(),
        signedOut: false,
        badgeMode: "remaining",
        nowMs: nowAtElapsedFraction(0.924),
      },
      action,
    );

    expect(setBadgeText).toHaveBeenCalledWith({ text: "34" });
  });
});
