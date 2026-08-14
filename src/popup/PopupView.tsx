import { computePacing } from "../domain/pacing";
import type { BadgeMode, UsageSnapshot } from "../domain/types";
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

const BADGE_MODE_OPTIONS: { mode: BadgeMode; label: string }[] = [
  { mode: "remaining", label: "Remaining" },
  { mode: "delta", label: "Delta" },
  { mode: "used", label: "Used" },
];

export type PopupViewProps = {
  snapshot: UsageSnapshot | null;
  signedOut: boolean;
  lastError: string | null;
  badgeMode: BadgeMode;
  nowMs: number;
  onRefresh?: () => void;
  onSignIn?: () => void;
  onOpenUsage?: () => void;
  onBadgeModeChange?: (mode: BadgeMode) => void;
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
        {formatPaceLabel(pacing.badgeDelta)}
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

function BadgeModeControl({
  badgeMode,
  onBadgeModeChange,
}: {
  badgeMode: BadgeMode;
  onBadgeModeChange?: (mode: BadgeMode) => void;
}) {
  return (
    <div className="pacer-badge-mode" role="group" aria-label="Badge display">
      {BADGE_MODE_OPTIONS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          className={
            mode === badgeMode
              ? "pacer-badge-mode__option pacer-badge-mode__option--active"
              : "pacer-badge-mode__option"
          }
          aria-pressed={mode === badgeMode}
          onClick={() => onBadgeModeChange?.(mode)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function PopupView({
  snapshot,
  signedOut,
  lastError,
  badgeMode,
  nowMs,
  onRefresh,
  onSignIn,
  onOpenUsage,
  onBadgeModeChange,
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

      <BadgeModeControl badgeMode={badgeMode} onBadgeModeChange={onBadgeModeChange} />

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
