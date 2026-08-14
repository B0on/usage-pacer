import { describe, expect, it } from "vitest";
import {
  formatIncludedHeading,
  formatModelPoolPercent,
  formatOtherModelsHint,
  formatPaceLabel,
  formatPlanLabel,
} from "./format";

describe("plan copy", () => {
  it("maps membership types to dashboard-style names", () => {
    expect(formatPlanLabel("pro")).toBe("Pro");
    expect(formatPlanLabel("pro_plus")).toBe("Pro+");
    expect(formatPlanLabel("ultra")).toBe("Ultra");
    expect(formatIncludedHeading("pro")).toBe("Included in Pro");
    expect(formatIncludedHeading("proPlus")).toBe("Included in Pro+");
  });

  it("uses plan-specific Other Models dollar floors", () => {
    expect(formatOtherModelsHint("pro")).toContain("$20");
    expect(formatOtherModelsHint("pro_plus")).toContain("$70");
    expect(formatOtherModelsHint("ultra")).toContain("$400");
    expect(formatOtherModelsHint("hobby")).not.toMatch(/\$\d+/);
  });
});

describe("formatPaceLabel", () => {
  it.each([
    { delta: -26.293, expected: "Behind −26.3pt" },
    { delta: 8, expected: "Ahead +8.0pt" },
    { delta: 0, expected: "On pace" },
    { delta: 0.04, expected: "On pace" },
    { delta: -0.06, expected: "Behind −0.1pt" },
  ])("$delta → $expected", ({ delta, expected }) => {
    expect(formatPaceLabel(delta)).toBe(expected);
  });
});

describe("formatModelPoolPercent", () => {
  it("rounds finite percents to one decimal and treats invalid values as 0.0%", () => {
    expect(formatModelPoolPercent(76.023)).toBe("76.0%");
    expect(formatModelPoolPercent(76.05)).toBe("76.1%");
    expect(formatModelPoolPercent(0)).toBe("0.0%");
    expect(formatModelPoolPercent(Number.NaN)).toBe("0.0%");
    expect(formatModelPoolPercent(Number.POSITIVE_INFINITY)).toBe("0.0%");
  });
});
