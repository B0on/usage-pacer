import { describe, expect, it } from "vitest";
import manifest from "../manifest.config";

describe("MV3 manifest scaffold", () => {
  it("targets Manifest V3", () => {
    expect(manifest.manifest_version).toBe(3);
  });

  it("declares the required permissions and Cursor host access", () => {
    expect(manifest.permissions).toEqual(
      expect.arrayContaining(["storage", "cookies", "alarms"]),
    );
    expect(manifest.host_permissions).toEqual(
      expect.arrayContaining([
        "https://cursor.com/*",
        "https://www.cursor.com/*",
      ]),
    );
  });

  it("wires the popup and background service worker", () => {
    expect(manifest.action?.default_popup).toBe("src/popup/index.html");
    expect(manifest.background?.service_worker).toBe(
      "src/background/service-worker.ts",
    );
  });
});
