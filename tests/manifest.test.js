const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8")
);

test("declares a valid Manifest V3 content script entry point", () => {
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.permissions.includes("storage"));
  assert.ok(manifest.permissions.includes("tabs"));
  assert.deepEqual(manifest.content_scripts, [
    {
      matches: ["<all_urls>"],
      js: ["content.js"],
      run_at: "document_idle"
    }
  ]);
});

test("declares the extension popup and service worker", () => {
  assert.equal(manifest.action.default_popup, "popup.html");
  assert.equal(manifest.background.service_worker, "service-worker.js");
});
