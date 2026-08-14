import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseUsageSummary } from "../cursor/parse";
import fixture from "../cursor/fixtures/usage-summary.json";
import { MS_PER_DAY } from "../domain/types";
import { STALE_CACHE_MS } from "../toolbar/stale";
import { PopupView } from "./PopupView";

const CYCLE_START = "2026-07-18T10:36:57.000Z";
const CYCLE_END = "2026-08-18T10:36:57.000Z";

function fixtureNowMs(): number {
  const start = Date.parse(CYCLE_START);
  const end = Date.parse(CYCLE_END);
  const totalDays = (end - start) / MS_PER_DAY;
  return start + totalDays * 0.924 * MS_PER_DAY;
}

function renderFixture(overrides: Partial<Parameters<typeof PopupView>[0]> = {}) {
  const snapshot = parseUsageSummary(fixture, fixtureNowMs());

  return render(
    <PopupView
      snapshot={snapshot}
      signedOut={false}
      lastError={null}
      badgeMode="remaining"
      nowMs={fixtureNowMs()}
      {...overrides}
    />,
  );
}

describe("PopupView", () => {
  it("renders screenshot fixture pills, pace label, and forecast", () => {
    renderFixture();

    expect(screen.getByText("66%")).toBeInTheDocument();
    expect(screen.getByText("92.4")).toBeInTheDocument();
    expect(screen.getByText("Behind −26pt")).toBeInTheDocument();
    expect(
      screen.getByText("At this pace, lasts through reset"),
    ).toBeInTheDocument();
  });

  it("hides the API bar when apiPercentUsed is zero", () => {
    renderFixture();

    expect(screen.queryByText("API")).not.toBeInTheDocument();
  });

  it("shows sign-in CTA when signed out", () => {
    renderFixture({ signedOut: true });

    expect(
      screen.getByRole("button", { name: "Open Cursor" }),
    ).toBeInTheDocument();
  });

  it("renders badge mode control", () => {
    renderFixture();

    expect(screen.getByRole("group", { name: "Badge display" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remaining" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Used" })).toBeInTheDocument();
  });

  it("does not show pills when signed out with stale cache", () => {
    const fetchedAt = 1_000_000;
    const nowMs = fetchedAt + STALE_CACHE_MS;

    render(
      <PopupView
        snapshot={null}
        signedOut={true}
        lastError={null}
        badgeMode="remaining"
        nowMs={nowMs}
      />,
    );

    expect(screen.queryByText("66%")).not.toBeInTheDocument();
    expect(screen.queryByText("92.4")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Cursor" }),
    ).toBeInTheDocument();
  });
});
