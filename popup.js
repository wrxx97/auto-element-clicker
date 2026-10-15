const DEFAULTS = {
  enabled: false,
  selectors: [],
  interval: 1500,
  cooldown: 8000
};

const elements = {
  enabled: document.querySelector("#enabled"),
  selectors: document.querySelector("#selectors"),
  interval: document.querySelector("#interval"),
  cooldown: document.querySelector("#cooldown"),
  save: document.querySelector("#save"),
  scanNow: document.querySelector("#scan-now"),
  validation: document.querySelector("#validation"),
  siteName: document.querySelector("#site-name"),
  status: document.querySelector("#status"),
  statusDot: document.querySelector("#status-dot"),
  clickCount: document.querySelector("#click-count")
};

let activeTab;

function parseSelectors(value) {
  return [...new Set(value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];
}

function validateSelectors(selectors) {
  const invalid = [];
  for (const selector of selectors) {
    try {
      document.querySelector(selector);
    } catch {
      invalid.push(selector);
    }
  }
  return invalid;
}

function updateStatus(enabled, totalClicks = 0) {
  elements.status.textContent = enabled ? "自动点击已启用" : "自动点击已停用";
  elements.statusDot.classList.toggle("active", enabled);
  elements.clickCount.textContent = totalClicks ? `本页已点击 ${totalClicks} 次` : "";
}

async function saveSettings() {
  const selectors = parseSelectors(elements.selectors.value);
  const invalid = validateSelectors(selectors);
  if (invalid.length) {
    elements.validation.textContent = `无效选择器：${invalid.slice(0, 2).join("；")}`;
    return false;
  }

  const settings = {
    enabled: elements.enabled.checked,
    selectors,
    interval: Math.min(60000, Math.max(250, Number(elements.interval.value) || DEFAULTS.interval)),
    cooldown: Math.min(300000, Math.max(1000, Number(elements.cooldown.value) || DEFAULTS.cooldown))
  };
  await chrome.storage.sync.set(settings);
  elements.interval.value = settings.interval;
  elements.cooldown.value = settings.cooldown;
  elements.validation.textContent = "";
  updateStatus(settings.enabled);
  return true;
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

async function refreshPageStatus() {
  if (!activeTab?.id) return;
  try {
    const response = await chrome.tabs.sendMessage(activeTab.id, { type: "get-status" });
    updateStatus(response.enabled, response.totalClicks);
  } catch {
    elements.status.textContent = "此页面不支持运行扩展";
    elements.scanNow.disabled = true;
  }
}

async function initialize() {
  const [settings, tab] = await Promise.all([
    chrome.storage.sync.get(DEFAULTS),
    getCurrentTab()
  ]);
  activeTab = tab;
  elements.enabled.checked = settings.enabled;
  elements.selectors.value = settings.selectors.join("\n");
  elements.interval.value = settings.interval;
  elements.cooldown.value = settings.cooldown;

  try {
    elements.siteName.textContent = new URL(tab.url).hostname;
  } catch {
    elements.siteName.textContent = "当前页面";
  }

  updateStatus(settings.enabled);
  await refreshPageStatus();
}

elements.save.addEventListener("click", saveSettings);
elements.enabled.addEventListener("change", saveSettings);
elements.scanNow.addEventListener("click", async () => {
  const isSaved = await saveSettings();
  if (!isSaved || !activeTab?.id) return;
  try {
    const response = await chrome.tabs.sendMessage(activeTab.id, { type: "scan-now" });
    updateStatus(elements.enabled.checked, response.totalClicks);
  } catch {
    elements.status.textContent = "无法扫描此页面";
  }
});

initialize();
