import { describe, expect, it } from "vitest";
import {
  formatIncludedHeading,
  formatModelPoolPercent,
  formatOtherModelsHint,
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

describe("formatModelPoolPercent", () => {
  it("rounds finite percents and treats invalid values as 0%", () => {
    expect(formatModelPoolPercent(76.023)).toBe("76%");
    expect(formatModelPoolPercent(Number.NaN)).toBe("0%");
    expect(formatModelPoolPercent(Number.POSITIVE_INFINITY)).toBe("0%");
  });
});
