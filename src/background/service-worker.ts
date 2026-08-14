// Usage Pacer service worker.
// Alarm registration, fetch orchestration, and signed-out wiring land in P0-6.

import { applyToolbar } from "../toolbar/apply";

export { applyToolbar };

chrome.runtime.onInstalled.addListener(() => {
  // P0-6: alarm + initial fetch → applyToolbar
});

export {};
