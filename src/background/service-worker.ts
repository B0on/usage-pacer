import {
  createDefaultDeps,
  handleBackgroundMessage,
  refreshAndApply,
  syncRefreshAlarm,
} from "./handlers";
import { REFRESH_ALARM_NAME } from "./messages";

const deps = createDefaultDeps();

async function startBackgroundSync(): Promise<void> {
  await syncRefreshAlarm(deps);
  await refreshAndApply(deps);
}

chrome.runtime.onInstalled.addListener(() => {
  void startBackgroundSync();
});

chrome.runtime.onStartup.addListener(() => {
  void startBackgroundSync();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM_NAME) {
    void refreshAndApply(deps);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handleBackgroundMessage(message, deps).then(sendResponse);
  return true;
});
