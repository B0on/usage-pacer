/** Design tokens — elapsed ring only; never pace red/yellow. */
export const RING_TRACK_COLOR = "#2a2a2a";
export const RING_FILL_COLOR = "#3d9a4a";

const ICON_SIZES = [16, 32] as const;

/** Clockwise sweep from 12 o'clock for elapsed fraction (0–100). */
export function elapsedSweepRadians(averagePct: number): number {
  const clamped = Math.min(100, Math.max(0, averagePct));
  return (clamped / 100) * 2 * Math.PI;
}

function drawElapsedRing(
  size: number,
  averagePct: number,
  showFill: boolean,
): ImageData {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("OffscreenCanvas 2d context unavailable");
  }

  const center = size / 2;
  const lineWidth = size / 8;
  const radius = center - lineWidth / 2 - 0.5;

  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.arc(center, center, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = RING_TRACK_COLOR;
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  if (showFill && averagePct > 0) {
    const sweep = elapsedSweepRadians(averagePct);
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + sweep;

    ctx.beginPath();
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.strokeStyle = RING_FILL_COLOR;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, size, size);
}

export type ElapsedRingIconData = Record<number, ImageData>;

/** Build 16×16 and 32×32 toolbar ring icons. */
export function buildElapsedRingIcon(
  averagePct: number,
  options: { showFill: boolean },
): ElapsedRingIconData {
  const imageData: ElapsedRingIconData = {};
  for (const size of ICON_SIZES) {
    imageData[size] = drawElapsedRing(size, averagePct, options.showFill);
  }
  return imageData;
}

export async function setElapsedRingIcon(
  averagePct: number,
  options: { showFill: boolean },
  action: Pick<typeof chrome.action, "setIcon"> = chrome.action,
): Promise<void> {
  const imageData = buildElapsedRingIcon(averagePct, options);
  await action.setIcon({ imageData });
}
