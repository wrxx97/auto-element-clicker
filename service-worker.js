const DEFAULTS = {
  enabled: false,
  selectors: [],
  interval: 1500,
  cooldown: 8000
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set(existing);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "click-record" && sender.tab?.id) {
    const text = String(message.totalClicks || "");
    chrome.action.setBadgeText({ tabId: sender.tab.id, text });
    chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: "#176f3c" });
  }

  if (message.type === "reset-badge" && sender.tab?.id) {
    chrome.action.setBadgeText({ tabId: sender.tab.id, text: "" });
  }

  if (message.type === "get-defaults") {
    sendResponse(DEFAULTS);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    chrome.action.setBadgeText({ tabId, text: "" });
  }
});
