import { computePacing } from "../domain/pacing";
import type { BadgeMode, RefreshInterval, UsageSnapshot } from "../domain/types";
import {
  formatDaysLeft,
  formatForecastCopy,
  formatIncludedHeading,
  formatModelPoolPercent,
  formatOtherModelsHint,
  formatPaceLabel,
  formatPlanLabel,
  formatRelativeSync,
  paceColorClass,
} from "./format";

const BADGE_MODE_OPTIONS: { value: BadgeMode; label: string }[] = [
  { value: "remaining", label: "Remaining" },
  { value: "delta", label: "Delta" },
  { value: "used", label: "Used" },
];

const REFRESH_INTERVAL_OPTIONS: { value: RefreshInterval; label: string }[] = [
  { value: "5min", label: "5 min" },
  { value: "15min", label: "15 min" },
  { value: "manual", label: "Manual" },
];

export type PopupViewProps = {
  snapshot: UsageSnapshot | null;
  signedOut: boolean;
  lastError: string | null;
  badgeMode: BadgeMode;
  refreshInterval: RefreshInterval;
  nowMs: number;
  onRefresh?: () => void;
  onSignIn?: () => void;
  onOpenUsage?: () => void;
  onBadgeModeChange?: (mode: BadgeMode) => void;
  onRefreshIntervalChange?: (interval: RefreshInterval) => void;
  hydrated?: boolean;
};

function ModelPoolBar({
  label,
  percentUsed,
  hint,
  fillClass,
}: {
  label: string;
  percentUsed: number;
  hint?: string;
  fillClass: string;
}) {
  const widthPct = Math.min(100, Math.max(0, percentUsed));
  const display = formatModelPoolPercent(percentUsed);

  return (
    <div className="pacer-bar">
      <div className="pacer-bar__header">
        <span className="pacer-bar__label">{label}</span>
        <span className="pacer-bar__value">{display}</span>
      </div>
      <div className="pacer-bar__track">
        <div
          className={`pacer-bar__fill ${fillClass}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      {hint ? <p className="pacer-bar__hint">{hint}</p> : null}
    </div>
  );
}

function UsageContent({
  snapshot,
  nowMs,
}: {
  snapshot: UsageSnapshot;
  nowMs: number;
}) {
  const pacing = computePacing(snapshot, nowMs);
  const daysLeft = formatDaysLeft(pacing.daysLeft);
  const forecastCopy = formatForecastCopy(pacing.forecast, snapshot.billingCycleEnd);

  return (
    <>
      <div className="pacer-pills" aria-label="Usage versus time in this billing cycle">
        <div className="pacer-pill pacer-pill--elapsed">
          <span className="pacer-pill__label">Elapsed</span>
          <span className="pacer-pill__value">{pacing.elapsedPillDisplay}%</span>
        </div>
        <div className="pacer-pill pacer-pill--used">
          <span className="pacer-pill__label">Used</span>
          <span className="pacer-pill__value">{pacing.usedPillDisplay}</span>
        </div>
      </div>

      <p className={`pacer-pace ${paceColorClass(pacing.paceColor)}`}>
        {formatPaceLabel(pacing.deltaPct)}
      </p>

      <div className="pacer-meta">
        <p className="pacer-meta__plan">{formatPlanLabel(snapshot.membershipType)}</p>
        <p className="pacer-meta__reset">Resets on {pacing.resetDateLocal}</p>
        <p className="pacer-meta__days">
          {daysLeft} day{daysLeft === 1 ? "" : "s"} left
        </p>
      </div>

      {forecastCopy ? <p className="pacer-forecast">{forecastCopy}</p> : null}

      <section className="pacer-bars" aria-label={formatIncludedHeading(snapshot.membershipType)}>
        <p className="pacer-bars__heading">{formatIncludedHeading(snapshot.membershipType)}</p>
        <ModelPoolBar
          label="Cursor Models"
          percentUsed={snapshot.autoPercentUsed}
          hint="Includes Cursor Grok and Composer"
          fillClass="pacer-bar__fill--cursor-models"
        />
        <ModelPoolBar
          label="Other Models"
          percentUsed={snapshot.apiPercentUsed}
          hint={formatOtherModelsHint(snapshot.membershipType)}
          fillClass="pacer-bar__fill--other-models"
        />
      </section>

      {snapshot.onDemand.enabled ? (
        <p className="pacer-ondemand">
          On-demand ON
          {snapshot.onDemand.used > 0
            ? ` · ${snapshot.onDemand.used.toLocaleString()} used`
            : null}
        </p>
      ) : null}
    </>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange?: (value: T) => void;
}) {
  return (
    <div className="pacer-setting">
      <p className="pacer-setting__label">{label}</p>
      <div className="pacer-segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              option.value === value
                ? "pacer-segmented__option pacer-segmented__option--active"
                : "pacer-segmented__option"
            }
            aria-pressed={option.value === value}
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PopupView({
  snapshot,
  signedOut,
  lastError,
  badgeMode,
  refreshInterval,
  nowMs,
  onRefresh,
  onSignIn,
  onOpenUsage,
  onBadgeModeChange,
  onRefreshIntervalChange,
  hydrated = true,
}: PopupViewProps) {
  return (
    <main className="pacer-popup">
      {hydrated && signedOut ? (
        <section className="pacer-signin" aria-label="Sign in">
          <p className="pacer-signin__text">Sign in to Cursor to sync your usage.</p>
          <button type="button" className="pacer-signin__cta" onClick={onSignIn}>
            Open Cursor
          </button>
        </section>
      ) : null}

      {lastError ? <p className="pacer-error">{lastError}</p> : null}

      {snapshot ? <UsageContent snapshot={snapshot} nowMs={nowMs} /> : null}

      {hydrated && !snapshot && !signedOut ? (
        <p className="pacer-empty">No usage data yet. Refresh to fetch.</p>
      ) : null}

      <div className="pacer-settings">
        <SegmentedControl
          label="Badge"
          value={badgeMode}
          options={BADGE_MODE_OPTIONS}
          onChange={onBadgeModeChange}
        />
        <SegmentedControl
          label="Sync"
          value={refreshInterval}
          options={REFRESH_INTERVAL_OPTIONS}
          onChange={onRefreshIntervalChange}
        />
      </div>

      <footer className="pacer-footer">
        {snapshot ? (
          <span className="pacer-footer__synced">
            Last synced {formatRelativeSync(snapshot.fetchedAt, nowMs)}
          </span>
        ) : (
          <span className="pacer-footer__synced">
            {hydrated ? "Not synced yet" : "Loading…"}
          </span>
        )}
        <div className="pacer-footer__actions">
          {snapshot && !signedOut ? (
            <button type="button" className="pacer-footer__link" onClick={onOpenUsage}>
              Usage
            </button>
          ) : null}
          <button type="button" className="pacer-footer__refresh" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </footer>
    </main>
  );
}
