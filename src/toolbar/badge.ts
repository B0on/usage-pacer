import { formatBadgeText } from "../domain/pacing";
import type { BadgeMode, PaceColor, PacingViewModel } from "../domain/types";

/** Badge background tokens from design-system.md */
export const PACE_BADGE_COLORS: Record<PaceColor, string> = {
  green: "#2f9e44",
  yellow: "#c9a227",
  red: "#c44536",
};

export const PACE_GREY = "#6b6b6b";

export const STALE_BADGE_TEXT = "—";

export type BadgePresentation = {
  text: string;
  backgroundColor: string;
};

export function resolveBadgePresentation(input: {
  viewModel: PacingViewModel | null;
  signedOut: boolean;
  stale: boolean;
  badgeMode: BadgeMode;
}): BadgePresentation {
  const { viewModel, signedOut, stale, badgeMode } = input;

  if (stale || !viewModel) {
    return { text: STALE_BADGE_TEXT, backgroundColor: PACE_GREY };
  }

  const text = formatBadgeText(viewModel, badgeMode);

  if (signedOut) {
    return { text, backgroundColor: PACE_GREY };
  }

  return {
    text,
    backgroundColor: PACE_BADGE_COLORS[viewModel.paceColor],
  };
}

export async function setToolbarBadge(
  presentation: BadgePresentation,
  action: Pick<
    typeof chrome.action,
    "setBadgeText" | "setBadgeBackgroundColor"
  > = chrome.action,
): Promise<void> {
  await action.setBadgeText({ text: presentation.text });
  await action.setBadgeBackgroundColor({ color: presentation.backgroundColor });
}
