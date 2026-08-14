import { render, screen, within } from "@testing-library/react";
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

    const pills = screen.getByLabelText("Usage versus time in this billing cycle");
    expect(within(pills).getByText("Elapsed")).toBeInTheDocument();
    expect(within(pills).getByText("Used")).toBeInTheDocument();
    expect(within(pills).getByText("92.4%")).toBeInTheDocument();
    expect(within(pills).getByText("66.1%")).toBeInTheDocument();
    expect(screen.getByText("Behind −26.3pt")).toBeInTheDocument();
    expect(
      screen.getByText("At this pace, lasts through reset"),
    ).toBeInTheDocument();
  });

  it("renders Cursor Models and Other Models pool bars", () => {
    renderFixture();

    expect(screen.getByText("Included in Pro")).toBeInTheDocument();
    expect(screen.getByText("Cursor Models")).toBeInTheDocument();
    expect(screen.getByText("Other Models")).toBeInTheDocument();
    expect(screen.getByText("76.0%")).toBeInTheDocument();
    expect(screen.getByText("0.0%")).toBeInTheDocument();
    expect(
      screen.getByText("Includes Cursor Grok and Composer"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your plan includes at least $20 of API usage"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Usage" })).toBeInTheDocument();
    expect(screen.queryByText("Included")).not.toBeInTheDocument();
    expect(screen.queryByText("Bonus")).not.toBeInTheDocument();
  });

  it("uses Pro+ copy for Other Models when membership is pro_plus", () => {
    const snapshot = parseUsageSummary(fixture, fixtureNowMs());
    render(
      <PopupView
        snapshot={{ ...snapshot, membershipType: "pro_plus" }}
        signedOut={false}
        lastError={null}
        badgeMode="remaining"
        nowMs={fixtureNowMs()}
      />,
    );

    expect(screen.getByText("Included in Pro+")).toBeInTheDocument();
    expect(screen.getByText("Pro+")).toBeInTheDocument();
    expect(
      screen.getByText("Your plan includes at least $70 of API usage"),
    ).toBeInTheDocument();
  });

  it("does not flash the sign-in CTA before hydration", () => {
    render(
      <PopupView
        snapshot={null}
        signedOut={true}
        lastError={null}
        badgeMode="remaining"
        nowMs={Date.now()}
        hydrated={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Open Cursor" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
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

    expect(screen.queryByText("66.1%")).not.toBeInTheDocument();
    expect(screen.queryByText("92.4%")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Cursor" }),
    ).toBeInTheDocument();
  });
});
