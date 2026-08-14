import {
  createDefaultDeps,
  handleBackgroundMessage,
  refreshAndApply,
  registerRefreshAlarm,
} from "./handlers";
import { REFRESH_ALARM_NAME } from "./messages";

const deps = createDefaultDeps();

chrome.runtime.onInstalled.addListener(() => {
  registerRefreshAlarm(chrome.alarms);
  void refreshAndApply(deps);
});

chrome.runtime.onStartup.addListener(() => {
  void refreshAndApply(deps);
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
