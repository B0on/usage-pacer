import { computePacing } from "../domain/pacing";
import type { UsageSnapshot } from "../domain/types";
import {
  capitalizeMembershipType,
  formatDaysLeft,
  formatForecastCopy,
  formatPaceLabel,
  formatRelativeSync,
  paceColorClass,
} from "./format";

export type PopupViewProps = {
  snapshot: UsageSnapshot | null;
  signedOut: boolean;
  lastError: string | null;
  nowMs: number;
  onRefresh?: () => void;
  onSignIn?: () => void;
};

function BreakdownBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const widthPct = total > 0 ? Math.min(100, (value / total) * 100) : 0;

  return (
    <div className="pacer-bar">
      <div className="pacer-bar__header">
        <span className="pacer-bar__label">{label}</span>
        <span className="pacer-bar__value">{value.toLocaleString()}</span>
      </div>
      <div className="pacer-bar__track">
        <div className="pacer-bar__fill" style={{ width: `${widthPct}%` }} />
      </div>
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
  const { breakdown } = snapshot;
  const daysLeft = formatDaysLeft(pacing.daysLeft);
  const forecastCopy = formatForecastCopy(pacing.forecast, snapshot.billingCycleEnd);

  return (
    <>
      <div className="pacer-pills" aria-label="Usage pacing">
        <div className="pacer-pill pacer-pill--used">{pacing.usedPillDisplay}</div>
        <div className="pacer-pill pacer-pill--elapsed">{pacing.elapsedPillDisplay}</div>
      </div>

      <p className={`pacer-pace ${paceColorClass(pacing.paceColor)}`}>
        {formatPaceLabel(pacing.badgeDelta)}
      </p>

      <div className="pacer-meta">
        <p className="pacer-meta__plan">{capitalizeMembershipType(snapshot.membershipType)}</p>
        <p className="pacer-meta__reset">Resets on {pacing.resetDateLocal}</p>
        <p className="pacer-meta__days">
          {daysLeft} day{daysLeft === 1 ? "" : "s"} left
        </p>
      </div>

      {forecastCopy ? <p className="pacer-forecast">{forecastCopy}</p> : null}

      <div className="pacer-bars">
        <BreakdownBar
          label="Included"
          value={breakdown.included}
          total={breakdown.total}
        />
        <BreakdownBar label="Bonus" value={breakdown.bonus} total={breakdown.total} />
        {snapshot.apiPercentUsed !== 0 ? (
          <div className="pacer-bar">
            <div className="pacer-bar__header">
              <span className="pacer-bar__label">API</span>
              <span className="pacer-bar__value">{snapshot.apiPercentUsed.toFixed(1)}%</span>
            </div>
            <div className="pacer-bar__track">
              <div
                className="pacer-bar__fill pacer-bar__fill--api"
                style={{ width: `${Math.min(100, snapshot.apiPercentUsed)}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

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

export function PopupView({
  snapshot,
  signedOut,
  lastError,
  nowMs,
  onRefresh,
  onSignIn,
}: PopupViewProps) {
  return (
    <main className="pacer-popup">
      {signedOut ? (
        <section className="pacer-signin" aria-label="Sign in">
          <p className="pacer-signin__text">Sign in to Cursor to sync your usage.</p>
          <button type="button" className="pacer-signin__cta" onClick={onSignIn}>
            Open Cursor
          </button>
        </section>
      ) : null}

      {lastError ? <p className="pacer-error">{lastError}</p> : null}

      {snapshot ? <UsageContent snapshot={snapshot} nowMs={nowMs} /> : null}

      {!snapshot && !signedOut ? (
        <p className="pacer-empty">No usage data yet. Refresh to fetch.</p>
      ) : null}

      <footer className="pacer-footer">
        {snapshot ? (
          <span className="pacer-footer__synced">
            Last synced {formatRelativeSync(snapshot.fetchedAt, nowMs)}
          </span>
        ) : (
          <span className="pacer-footer__synced">Not synced yet</span>
        )}
        <button type="button" className="pacer-footer__refresh" onClick={onRefresh}>
          Refresh
        </button>
      </footer>
    </main>
  );
}
