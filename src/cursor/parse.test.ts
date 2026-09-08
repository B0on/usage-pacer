import { describe, expect, it } from "vitest";
import fixture from "./fixtures/usage-summary.json";
import { ParseError, parseSandUsageStatus, parseUsageSummary } from "./parse";

const NOW_MS = 1_725_000_000_000;

describe("parseUsageSummary", () => {
  it("parses the live fixture into a UsageSnapshot", () => {
    const snapshot = parseUsageSummary(fixture, NOW_MS);

    expect(snapshot).toEqual({
      billingCycleStart: "2026-07-18T10:36:57.000Z",
      billingCycleEnd: "2026-08-18T10:36:57.000Z",
      totalPercentUsed: 66.10724637681159,
      onDemand: { enabled: false, used: 0 },
      breakdown: { included: 2000, bonus: 20807, total: 22807 },
      autoPercentUsed: 76.02333333333333,
      apiPercentUsed: 0,
      membershipType: "pro",
      grokBot: null,
      fetchedAt: NOW_MS,
    });
  });

  it("uses totalPercentUsed, not autoPercentUsed or remaining", () => {
    const payload = {
      ...fixture,
      individualUsage: {
        ...fixture.individualUsage,
        plan: {
          ...fixture.individualUsage.plan,
          remaining: 999,
          autoPercentUsed: 76.02333333333333,
          totalPercentUsed: 12.5,
        },
      },
    };

    expect(parseUsageSummary(payload, NOW_MS).totalPercentUsed).toBe(12.5);
  });

  it("rejects invalid billing cycle dates", () => {
    expect(() =>
      parseUsageSummary(
        { ...fixture, billingCycleStart: "not-a-date" },
        NOW_MS,
      ),
    ).toThrow(ParseError);

    expect(() =>
      parseUsageSummary({ ...fixture, billingCycleEnd: "" }, NOW_MS),
    ).toThrow(ParseError);
  });

  it("rejects incomplete payloads", () => {
    expect(() => parseUsageSummary({}, NOW_MS)).toThrow(ParseError);
    expect(() =>
      parseUsageSummary({ ...fixture, individualUsage: {} }, NOW_MS),
    ).toThrow(ParseError);
    expect(() =>
      parseUsageSummary(
        {
          ...fixture,
          individualUsage: {
            ...fixture.individualUsage,
            plan: { ...fixture.individualUsage.plan, breakdown: undefined },
          },
        },
        NOW_MS,
      ),
    ).toThrow(ParseError);
  });
});

describe("parseSandUsageStatus", () => {
  const sandFixture = {
    currentPeriodStart: "2026-09-05T18:22:04.315Z",
    nextResetTimestampUtc: "2026-09-10T09:56:04.851Z",
    usagePercent: 0,
    hasAvailableUsage: true,
    hasNonZeroIncludedLimit: true,
    upgradeRecommendation: {
      cta: { label: "Upgrade to Pro+", url: { url: "https://cursor.com/x" } },
      supportingText: "Get $500 of Grok Bot usage each week with Pro+",
      kind: "upgrade-to-pro-plus-for-more-usage",
    },
    upgradeRecommendations: [],
    onDemandSettings: { visible: true, eligible: true, dashboardUrl: "" },
    grokPlanLabel: "Grok Bot Plan",
  };

  it("parses the live sand fixture into GrokBotUsage", () => {
    expect(parseSandUsageStatus(sandFixture)).toEqual({
      usagePercent: 0,
      currentPeriodStart: "2026-09-05T18:22:04.315Z",
      nextResetTimestampUtc: "2026-09-10T09:56:04.851Z",
      hasNonZeroIncludedLimit: true,
    });
  });

  it("rejects invalid reset timestamps", () => {
    expect(() =>
      parseSandUsageStatus({ ...sandFixture, nextResetTimestampUtc: "nope" }),
    ).toThrow(ParseError);
  });

  it("rejects missing usagePercent", () => {
    const { usagePercent: _usagePercent, ...rest } = sandFixture;
    expect(() => parseSandUsageStatus(rest)).toThrow(ParseError);
  });

  it("rejects non-object payloads", () => {
    expect(() => parseSandUsageStatus(null)).toThrow(ParseError);
    expect(() => parseSandUsageStatus([])).toThrow(ParseError);
  });
});
