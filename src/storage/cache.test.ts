import { describe, expect, it } from "vitest";
import fixture from "../cursor/fixtures/usage-summary.json";
import { parseUsageSummary } from "../cursor/parse";
import {
  applyFetchResult,
  getCache,
  getSnapshot,
  refreshUsageSummary,
  setSnapshot,
} from "./cache";

const NOW_MS = 1_725_000_000_000;

type MemoryStore = Record<string, unknown>;

function createMockStorage(initial: MemoryStore = {}) {
  const store: MemoryStore = { ...initial };

  return {
    get: async (keys: string[] | Record<string, unknown>) => {
      if (Array.isArray(keys)) {
        return Object.fromEntries(
          keys.map((key) => [key, store[key] ?? undefined]),
        );
      }
      return { ...store };
    },
    set: async (items: Record<string, unknown>) => {
      Object.assign(store, items);
    },
    snapshot: () => ({ ...store }),
  };
}

describe("cache", () => {
  it("defaults badgeMode to remaining and exposes null snapshot", async () => {
    const storage = createMockStorage();

    await expect(getCache(storage)).resolves.toEqual({
      snapshot: null,
      badgeMode: "remaining",
      refreshInterval: "15min",
      lastError: null,
    });
  });

  it("stores and reads a snapshot", async () => {
    const storage = createMockStorage();
    const snapshot = parseUsageSummary(fixture, NOW_MS);

    await setSnapshot(snapshot, storage);
    await expect(getSnapshot(storage)).resolves.toEqual(snapshot);
  });

  it("keeps the previous snapshot and sets lastError on parse failure", async () => {
    const storage = createMockStorage();
    const snapshot = parseUsageSummary(fixture, NOW_MS);
    await setSnapshot(snapshot, storage);

    const state = await applyFetchResult(
      { kind: "error", message: "Invalid JSON in usage-summary response" },
      storage,
    );

    expect(state.snapshot).toEqual(snapshot);
    expect(state.lastError).toBe("Invalid JSON in usage-summary response");
  });

  it("clears lastError and updates snapshot on success", async () => {
    const storage = createMockStorage({
      lastError: "stale error",
    });
    const snapshot = parseUsageSummary(fixture, NOW_MS);

    const state = await applyFetchResult(
      { kind: "success", snapshot },
      storage,
    );

    expect(state.snapshot).toEqual(snapshot);
    expect(state.lastError).toBeNull();
  });

  it("refreshUsageSummary applies fetch results through cache", async () => {
    const storage = createMockStorage();
    const snapshot = parseUsageSummary(fixture, NOW_MS);

    const state = await refreshUsageSummary(
      async () => ({ kind: "success", snapshot }),
      storage,
    );

    expect(state.snapshot).toEqual(snapshot);
    expect(state.lastError).toBeNull();
  });

  it("clears lastError and keeps snapshot on signed_out", async () => {
    const storage = createMockStorage({ lastError: "stale error" });
    const snapshot = parseUsageSummary(fixture, NOW_MS);
    await setSnapshot(snapshot, storage);

    const state = await applyFetchResult({ kind: "signed_out" }, storage);

    expect(state.snapshot).toEqual(snapshot);
    expect(state.lastError).toBeNull();
  });

  it("defaults missing autoPercentUsed on legacy cached snapshots", async () => {
    const snapshot = parseUsageSummary(fixture, NOW_MS);
    const legacy = { ...snapshot } as Record<string, unknown>;
    delete legacy.autoPercentUsed;
    const storage = createMockStorage({ snapshot: legacy });

    const state = await getCache(storage);

    expect(state.snapshot?.autoPercentUsed).toBe(0);
    expect(state.snapshot?.totalPercentUsed).toBe(snapshot.totalPercentUsed);
  });

  it("defaults refreshInterval to 15min and accepts stored values", async () => {
    const empty = createMockStorage();
    await expect(getCache(empty)).resolves.toMatchObject({
      refreshInterval: "15min",
    });

    const stored = createMockStorage({ refreshInterval: "5min" });
    await expect(getCache(stored)).resolves.toMatchObject({
      refreshInterval: "5min",
    });

    const invalid = createMockStorage({ refreshInterval: "hourly" });
    await expect(getCache(invalid)).resolves.toMatchObject({
      refreshInterval: "15min",
    });
  });
});
