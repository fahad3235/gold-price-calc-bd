/* Headless-Chrome QA for Gold Price Calculator BD (puppeteer-core + system Chromium).
 * Run: node smoke.js   (run from this directory; uses ./node_modules/puppeteer-core)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const FILE = "file:///home/hatch/workspace/muse-project-factory/builds/gold-price-calc-bd/index.html";
const EXPORT_TMP = "/tmp/gpcbd-export.json";

let pass = 0, fail = 0;
function eq(actual, expected, label) {
  if (actual === expected) { pass++; console.log("  ok:", label); }
  else { fail++; console.error("FAIL:", label, "\n  expected:", JSON.stringify(expected), "\n  actual:  ", JSON.stringify(actual)); }
}
function ok(cond, label) {
  if (cond) { pass++; console.log("  ok:", label); }
  else { fail++; console.error("FAIL:", label); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/opt/meta-chromium/chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"]
  });
  const errors = [];
  const netRequests = [];
  try {
    const page = await browser.newPage();
    page.on("dialog", d => d.accept());
    page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
    page.on("pageerror", e => errors.push("pageerror: " + e.message));
    page.on("request", r => {
      const u = r.url();
      if (!u.startsWith("file://") && !u.startsWith("data:") && !u.startsWith("blob:")) netRequests.push(u);
    });

    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(FILE, { waitUntil: "load", timeout: 30000 });
    await page.waitForFunction(
      () => document.querySelector('[data-i18n="appTitle"]').textContent.length > 3, { timeout: 5000 });

    // --- 1. initial state, EN default ---
    eq(await page.title(), "Gold Price Calculator BD — স্বর্ণের দাম ক্যালকুলেটর", "page title");
    eq(await page.$eval('[data-i18n="appTitle"]', el => el.textContent), "Gold Price Calculator BD", "EN title default");
    eq(await page.$eval('[data-i18n="rateHint"]', el => el.textContent),
      "Enter today's market rate (no live feed)", "no-live-feed label visible");
    eq(await page.$eval("#lang-toggle", el => el.textContent), "বাংলা", "lang toggle offers বাংলা");
    eq(await page.$eval("#results-filled", el => el.hidden), true, "results empty state before calc");
    eq(await page.$eval("#history-empty", el => el.hidden), false, "history empty state visible");
    eq(await page.$eval('#karat-buttons button[aria-pressed="true"]', el => el.textContent), "22", "default karat 22");
    ok(netRequests.length === 0, "zero non-file network requests on load");

    // --- 2. HAND-VERIFIED case: 2 bhori 22k @150000 +10% = 302,500 ---
    await page.$eval("#rate", el => el.value = "150000");
    await page.$eval("#weight", el => el.value = "2");
    await page.$eval("#making", el => el.value = "10");
    await page.click('#calc-form button[type="submit"]');
    await page.waitForFunction(() => !document.getElementById("results-filled").hidden, { timeout: 5000 });
    eq(await page.$eval("#r-total", el => el.textContent), "৳3,02,500.00", "HAND CASE total = ৳302,500");
    eq(await page.$eval("#r-base", el => el.textContent), "৳2,75,000.00", "base = ৳275,000");
    ok((await page.$eval("#r-making", el => el.textContent)).includes("৳27,500.00"), "making = ৳27,500");
    eq(await page.$eval("#r-purity", el => el.textContent), "22/24", "purity 22/24");
    ok(netRequests.length === 0, "still zero network requests after calc");

    // --- 3. karat switching ---
    await page.click('#karat-buttons button[aria-pressed="false"]'); // first non-24? click 24
    // click the 24k button explicitly
    await page.$$eval("#karat-buttons button", els => els.find(b => b.textContent === "24").click());
    eq(await page.$eval("#r-total", el => el.textContent), "৳3,30,000.00", "24k: 2*150000*1.1 = 330,000");
    await page.$$eval("#karat-buttons button", els => els.find(b => b.textContent === "18").click());
    eq(await page.$eval("#r-total", el => el.textContent), "৳2,47,500.00", "18k: 2*150000*0.75*1.1 = 247,500");
    await page.$$eval("#karat-buttons button", els => els.find(b => b.textContent === "24").click());

    // --- 4. unit switching equivalences (karat 24, rate 150000, making 10) ---
    await page.$eval("#weight", el => el.value = "1");
    await page.select("#weight-unit", "ana");
    await page.$eval("#weight", el => el.value = "16");
    await page.click('#calc-form button[type="submit"]');
    eq(await page.$eval("#r-total", el => el.textContent), "৳1,65,000.00", "16 ana == 1 bhori total");
    ok((await page.$eval("#weight-eq", el => el.textContent)).includes("96"), "weight-eq shows 96 ratti");
    await page.select("#weight-unit", "ratti");
    await page.$eval("#weight", el => el.value = "96");
    await page.click('#calc-form button[type="submit"]');
    eq(await page.$eval("#r-total", el => el.textContent), "৳1,65,000.00", "96 ratti == 1 bhori total");
    await page.select("#weight-unit", "gram");
    await page.$eval("#weight", el => el.value = "11.664");
    await page.click('#calc-form button[type="submit"]');
    eq(await page.$eval("#r-total", el => el.textContent), "৳1,65,000.00", "11.664 g == 1 bhori total");
    // back to bhori/1
    await page.select("#weight-unit", "bhori");
    await page.$eval("#weight", el => el.value = "1");

    // --- 5. making charge 0 ---
    await page.$eval("#making", el => el.value = "0");
    await page.click('#calc-form button[type="submit"]');
    eq(await page.$eval("#r-total", el => el.textContent), "৳1,50,000.00", "making 0% -> total = base");
    await page.$eval("#making", el => el.value = "10");

    // --- 6. validation ---
    await page.$eval("#rate", el => el.value = "");
    await page.click('#calc-form button[type="submit"]');
    await page.waitForFunction(() => document.getElementById("err-rate").classList.contains("show"), { timeout: 5000 });
    eq(await page.$eval("#results-filled", el => el.hidden), true, "results hidden on invalid submit");
    eq(await page.$eval("#rate", el => el.classList.contains("invalid")), true, "rate marked invalid");
    await page.$eval("#rate", el => el.value = "150000");
    await page.click('#calc-form button[type="submit"]');
    await page.waitForFunction(() => !document.getElementById("results-filled").hidden, { timeout: 5000 });
    eq(await page.$eval("#r-total", el => el.textContent), "৳1,65,000.00", "recalc ok after fix");

    // --- 7. history add/delete ---
    await page.$eval("#hist-date", el => el.value = "2026-10-12");
    await page.$eval("#hist-note", el => el.value = "test market");
    await page.click("#save-rate");
    await page.waitForFunction(() => document.getElementById("history-count").textContent === "1", { timeout: 5000 });
    eq(await page.$eval("#history-count", el => el.textContent), "1", "history badge = 1");
    ok((await page.$eval("#history-list", el => el.textContent)).includes("৳1,50,000.00"), "entry shows rate");
    ok((await page.$eval("#history-list", el => el.textContent)).includes("test market"), "entry shows note");
    eq(await page.$eval("#history-empty", el => el.hidden), true, "history empty state hidden");
    await page.click("#history-list .hist-item .btn.danger");
    await page.waitForFunction(() => document.getElementById("history-count").textContent === "0", { timeout: 5000 });
    eq(await page.$eval("#history-empty", el => el.hidden), false, "history empty state back after delete");

    // --- 8. persistence across reload ---
    await page.click("#save-rate");
    await page.waitForFunction(() => document.getElementById("history-count").textContent === "1", { timeout: 5000 });
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(
      () => document.querySelector('[data-i18n="appTitle"]').textContent.length > 3, { timeout: 5000 });
    eq(await page.$eval("#history-count", el => el.textContent), "1", "history persists after reload");
    eq(await page.$eval("#rate", el => el.value), "150000", "rate setting persists");
    eq(await page.$eval('#karat-buttons button[aria-pressed="true"]', el => el.textContent), "24", "karat persists");

    // --- 9. BN toggle + Bengali digits ---
    await page.click("#lang-toggle");
    eq(await page.$eval('[data-i18n="appTitle"]', el => el.textContent), "স্বর্ণের দাম ক্যালকুলেটর", "BN title");
    eq(await page.$eval('[data-i18n="rateHint"]', el => el.textContent),
      "আজকের বাজার দর লিখুন (কোনো লাইভ ফিড নেই)", "BN no-live-feed label");
    ok((await page.$eval("#r-total", el => el.textContent)).includes("১,৬৫,০০০"), "BN total uses Bengali digits");
    eq(await page.$eval("#lang-toggle", el => el.textContent), "English", "toggle offers English");
    ok((await page.$eval("#history-list", el => el.textContent)).includes("১,৫০,০০০"), "BN history digits");
    await page.click("#lang-toggle"); // back to EN

    // --- 10. export/import round-trip ---
    const exported = await page.evaluate(() => window.__exportJSON());
    const parsed = JSON.parse(exported);
    eq(parsed.length, 1, "export has 1 entry");
    eq(parsed[0].rate, 150000, "exported rate correct");
    eq(parsed[0].date, "2026-10-12", "exported date correct");
    fs.writeFileSync(EXPORT_TMP, exported);
    await page.click("#clear-btn"); // confirm auto-accepted
    await page.waitForFunction(() => document.getElementById("history-count").textContent === "0", { timeout: 5000 });
    eq(await page.$eval("#rate", el => el.value), "", "clear wipes settings");
    const fh = await page.$("#import-file");
    await fh.uploadFile(EXPORT_TMP);
    await page.waitForFunction(() => document.getElementById("history-count").textContent === "1", { timeout: 5000 });
    eq(await page.$eval("#history-count", el => el.textContent), "1", "import restores 1 entry");
    // bad import -> toast error, count unchanged
    fs.writeFileSync(EXPORT_TMP, "not json at all");
    await fh.uploadFile(EXPORT_TMP);
    await sleep(700);
    eq(await page.$eval("#history-count", el => el.textContent), "1", "bad import rejected, count unchanged");
    ok((await page.$eval("#toast", el => el.textContent)).length > 0, "toast shown for bad import");

    eq(errors.length, 0, "zero console/page errors on desktop: " + JSON.stringify(errors));
    ok(netRequests.length === 0, "zero network requests total on desktop");

    // --- 11. mobile 390px ---
    const m = await browser.newPage();
    m.on("console", mm => { if (mm.type() === "error") errors.push("mobile console: " + mm.text()); });
    m.on("pageerror", e => errors.push("mobile pageerror: " + e.message));
    await m.setViewport({ width: 390, height: 844, isMobile: true });
    await m.goto(FILE, { waitUntil: "load", timeout: 30000 });
    await m.waitForFunction(
      () => document.querySelector('[data-i18n="appTitle"]').textContent.length > 3, { timeout: 5000 });
    const sw = await m.evaluate(() => document.documentElement.scrollWidth);
    ok(sw <= 390, "no horizontal overflow at 390px (scrollWidth=" + sw + ")");
    await m.$eval("#rate", el => el.value = "150000");
    await m.$eval("#weight", el => el.value = "2");
    await m.$eval("#making", el => el.value = "10");
    await m.click('#calc-form button[type="submit"]');
    await m.waitForFunction(() => !document.getElementById("results-filled").hidden, { timeout: 5000 });
    eq(await m.$eval("#r-total", el => el.textContent), "৳3,02,500.00", "mobile: hand case = ৳302,500");
    await m.click("#lang-toggle");
    ok((await m.$eval("#r-total", el => el.textContent)).includes("৩,০২,৫০০"), "mobile BN digits");
    const msw = await m.evaluate(() => document.documentElement.scrollWidth);
    ok(msw <= 390, "no overflow at 390px after calc (scrollWidth=" + msw + ")");

    eq(errors.length, 0, "zero console/page errors overall: " + JSON.stringify(errors));
  } finally {
    await browser.close();
  }
  console.log(`\nbrowser: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("HARNESS ERROR:", e); process.exit(2); });
