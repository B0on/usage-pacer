import type { BackgroundMessage, PopupState } from "../background/messages";

export async function sendBackgroundMessage(
  message: BackgroundMessage,
): Promise<PopupState> {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    throw new Error("Chrome runtime is unavailable");
  }

  const response: unknown = await chrome.runtime.sendMessage(message);

  if (!response || typeof response !== "object") {
    throw new Error("Invalid background response");
  }

  return response as PopupState;
}
