(() => {
  const DEFAULTS = {
    enabled: false,
    selectors: [],
    interval: 1500,
    cooldown: 8000
  };

  let config = { ...DEFAULTS };
  let intervalId = null;
  let mutationTimer = null;
  let totalClicks = 0;
  const lastClicks = new WeakMap();

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) !== 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function canClick(element) {
    if (!element.isConnected || !isVisible(element)) return false;
    if (element.matches("[disabled], [aria-disabled='true']")) return false;

    const lastClick = lastClicks.get(element) || 0;
    return Date.now() - lastClick >= config.cooldown;
  }

  function clickElement(element, selector) {
    if (!canClick(element)) return false;

    lastClicks.set(element, Date.now());
    element.click();
    totalClicks += 1;
    chrome.runtime.sendMessage({
      type: "click-record",
      totalClicks,
      selector
    });
    return true;
  }

  function scan() {
    if (!config.enabled || !config.selectors.length) return;

    for (const selector of config.selectors) {
      try {
        for (const element of document.querySelectorAll(selector)) {
          clickElement(element, selector);
        }
      } catch {
        // Invalid selectors are shown in the extension popup and skipped here.
      }
    }
  }

  function scheduleScan() {
    window.clearTimeout(mutationTimer);
    mutationTimer = window.setTimeout(scan, 100);
  }

  function applyConfig(nextConfig) {
    config = {
      ...DEFAULTS,
      ...nextConfig,
      interval: Math.max(250, Number(nextConfig.interval) || DEFAULTS.interval),
      cooldown: Math.max(1000, Number(nextConfig.cooldown) || DEFAULTS.cooldown)
    };

    window.clearInterval(intervalId);
    intervalId = null;
    if (config.enabled) {
      scan();
      intervalId = window.setInterval(scan, config.interval);
    } else {
      chrome.runtime.sendMessage({ type: "reset-badge" });
    }
  }

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  chrome.storage.sync.get(DEFAULTS).then(applyConfig);
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    const changedConfig = { ...config };
    for (const [key, change] of Object.entries(changes)) {
      changedConfig[key] = change.newValue;
    }
    applyConfig(changedConfig);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "get-status") {
      sendResponse({
        enabled: config.enabled,
        totalClicks,
        selectors: config.selectors
      });
    }
    if (message.type === "scan-now") {
      scan();
      sendResponse({ totalClicks });
    }
  });
})();
