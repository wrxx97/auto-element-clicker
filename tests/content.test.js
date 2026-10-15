const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const contentScript = fs.readFileSync(
  path.join(__dirname, "..", "content.js"),
  "utf8"
);

function createElement(options = {}) {
  const state = {
    clicks: 0,
    disabled: false,
    connected: true,
    display: "block",
    visibility: "visible",
    opacity: "1",
    width: 20,
    height: 20,
    ...options
  };

  return {
    state,
    get isConnected() {
      return state.connected;
    },
    matches() {
      return state.disabled;
    },
    getBoundingClientRect() {
      return { width: state.width, height: state.height };
    },
    click() {
      state.clicks += 1;
    }
  };
}

async function startContentScript({ config, elementsBySelector = {}, invalidSelectors = [] }) {
  const runtimeListeners = [];
  const storageListeners = [];
  const messages = [];
  const intervals = [];

  const document = {
    documentElement: {},
    querySelectorAll(selector) {
      if (invalidSelectors.includes(selector)) {
        throw new Error(`Invalid selector: ${selector}`);
      }
      return elementsBySelector[selector] || [];
    }
  };

  const sandbox = {
    Date,
    document,
    MutationObserver: class {
      observe() {}
    },
    window: {
      getComputedStyle(element) {
        return {
          display: element.state.display,
          visibility: element.state.visibility,
          opacity: element.state.opacity
        };
      },
      setInterval(callback, delay) {
        const interval = { callback, delay };
        intervals.push(interval);
        return interval;
      },
      clearInterval() {},
      setTimeout() {
        return 1;
      },
      clearTimeout() {}
    },
    chrome: {
      runtime: {
        sendMessage(message) {
          messages.push(message);
        },
        onMessage: {
          addListener(listener) {
            runtimeListeners.push(listener);
          }
        }
      },
      storage: {
        sync: {
          get() {
            return Promise.resolve(config);
          }
        },
        onChanged: {
          addListener(listener) {
            storageListeners.push(listener);
          }
        }
      }
    }
  };

  vm.runInNewContext(contentScript, sandbox, { filename: "content.js" });
  await new Promise((resolve) => setImmediate(resolve));

  return { intervals, messages, runtimeListeners, storageListeners };
}

function sendMessage(listener, message) {
  let response;
  listener(message, {}, (value) => {
    response = value;
  });
  return response;
}

function toPlainObject(value) {
  return JSON.parse(JSON.stringify(value));
}

test("clicks visible matching elements after the configuration loads", async () => {
  const closeButton = createElement();
  const app = await startContentScript({
    config: {
      enabled: true,
      selectors: [".ad-close"],
      interval: 1200,
      cooldown: 8000
    },
    elementsBySelector: { ".ad-close": [closeButton] }
  });

  assert.equal(closeButton.state.clicks, 1);
  assert.equal(app.intervals.length, 1);
  assert.equal(app.intervals[0].delay, 1200);
  assert.deepEqual(toPlainObject(app.messages[0]), {
    type: "click-record",
    totalClicks: 1,
    selector: ".ad-close"
  });
});

test("does not click hidden, disabled, or detached matching elements", async () => {
  const hiddenButton = createElement({ display: "none" });
  const disabledButton = createElement({ disabled: true });
  const detachedButton = createElement({ connected: false });

  const app = await startContentScript({
    config: {
      enabled: true,
      selectors: [".ad-close"],
      interval: 1500,
      cooldown: 8000
    },
    elementsBySelector: { ".ad-close": [hiddenButton, disabledButton, detachedButton] }
  });

  assert.equal(hiddenButton.state.clicks, 0);
  assert.equal(disabledButton.state.clicks, 0);
  assert.equal(detachedButton.state.clicks, 0);
  assert.equal(app.messages.length, 0);
});

test("respects the cooldown when an immediate scan is requested twice", async () => {
  const closeButton = createElement();
  const app = await startContentScript({
    config: {
      enabled: true,
      selectors: [".ad-close"],
      interval: 1500,
      cooldown: 8000
    },
    elementsBySelector: { ".ad-close": [closeButton] }
  });

  const response = sendMessage(app.runtimeListeners[0], { type: "scan-now" });

  assert.equal(closeButton.state.clicks, 1);
  assert.deepEqual(toPlainObject(response), { totalClicks: 1 });
});

test("keeps scanning valid selectors when another selector is invalid", async () => {
  const closeButton = createElement();
  await startContentScript({
    config: {
      enabled: true,
      selectors: ["[", ".ad-close"],
      interval: 1500,
      cooldown: 8000
    },
    invalidSelectors: ["["],
    elementsBySelector: { ".ad-close": [closeButton] }
  });

  assert.equal(closeButton.state.clicks, 1);
});

test("stops clicking after the extension is disabled through storage", async () => {
  const closeButton = createElement();
  const app = await startContentScript({
    config: {
      enabled: true,
      selectors: [".ad-close"],
      interval: 1500,
      cooldown: 8000
    },
    elementsBySelector: { ".ad-close": [closeButton] }
  });

  app.storageListeners[0]({ enabled: { newValue: false } }, "sync");
  sendMessage(app.runtimeListeners[0], { type: "scan-now" });

  assert.equal(closeButton.state.clicks, 1);
  assert.deepEqual(toPlainObject(app.messages.at(-1)), { type: "reset-badge" });
});
