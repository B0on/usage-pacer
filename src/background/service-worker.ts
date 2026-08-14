// Usage Pacer service worker (P0-1 scaffold).
// No-op for now: alarm registration, cookie checks, fetch orchestration, and
// icon/badge painting arrive in later phases (P0-3, P0-4, P0-6).

chrome.runtime.onInstalled.addListener(() => {
  // Intentionally empty. Wiring lands in P0-6.
});

export {};
