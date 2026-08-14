import pkg from "./package.json" with { type: "json" };

export const manifest = {
  manifest_version: 3,
  name: "Usage Pacer",
  description: "Pace your Cursor usage against the billing-cycle reset date.",
  version: pkg.version,
  action: {
    default_popup: "src/popup/index.html",
    default_title: "Usage Pacer",
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  permissions: ["storage", "cookies", "alarms"],
  host_permissions: ["https://cursor.com/*", "https://www.cursor.com/*"],
} satisfies chrome.runtime.ManifestV3;

export default manifest;
