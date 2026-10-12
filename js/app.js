/* Gold Price Calculator BD — UI wiring. Depends on js/calc.js and js/i18n.js. */
"use strict";

(function () {
  var GC = window.GoldCalc;
  var STR = window.GoldI18n;

  var LS_SETTINGS = "gpcbd_settings_v1";
  var LS_HISTORY = "gpcbd_history_v1";

  var state = {
    lang: "en",
    karat: 22,
    rate: "",
    weight: "",
    unit: "bhori",
    making: "10"
  };

  function t(key) { return STR[state.lang][key]; }

  function $(id) { return document.getElementById(id); }

  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}");
      if (s.lang === "en" || s.lang === "bn") state.lang = s.lang;
      if ([24, 22, 21, 18].indexOf(s.karat) >= 0) state.karat = s.karat;
      if (typeof s.rate === "string") state.rate = s.rate;
      if (typeof s.weight === "string") state.weight = s.weight;
      if (["bhori","ana","ratti","gram"].indexOf(s.unit) >= 0) state.unit = s.unit;
      if (typeof s.making === "string") state.making = s.making;
    } catch (e) { /* corrupted storage: start fresh */ }
  }

  function saveSettings() {
    try {
      localStorage.setItem(LS_SETTINGS, JSON.stringify({
        lang: state.lang, karat: state.karat, rate: state.rate,
        weight: state.weight, unit: state.unit, making: state.making
      }));
    } catch (e) { /* storage full/blocked: ignore */ }
  }

  function getHistory() {
    try {
      var h = JSON.parse(localStorage.getItem(LS_HISTORY) || "[]");
      return Array.isArray(h) ? h.filter(validEntry) : [];
    } catch (e) { return []; }
  }

  function setHistory(h) {
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(h)); } catch (e) {}
  }

  function validEntry(e) {
    return e && typeof e.rate === "number" && isFinite(e.rate) && e.rate > 0 &&
           typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date);
  }

  function applyI18n() {
    document.documentElement.lang = state.lang === "bn" ? "bn" : "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (STR[state.lang][k] != null) el.textContent = STR[state.lang][k];
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-ph");
      if (STR[state.lang][k] != null) el.setAttribute("placeholder", STR[state.lang][k]);
    });
    $("lang-toggle").textContent = t("langName");
    // unit select options
    var sel = $("weight-unit");
    ["bhori","ana","ratti","gram"].forEach(function (u) {
      sel.querySelector('option[value="' + u + '"]').textContent = t("unit_" + u);
    });
    renderKaratButtons();
    renderResults();  // re-render numbers with correct digits
    renderHistory();
  }

  function renderKaratButtons() {
    var wrap = $("karat-buttons");
    wrap.innerHTML = "";
    [24, 22, 21, 18].forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "karat-btn" + (k === state.karat ? " active" : "");
      b.textContent = state.lang === "bn" ? GC.toBnDigits(String(k)) : String(k);
      b.setAttribute("aria-pressed", k === state.karat ? "true" : "false");
      b.addEventListener("click", function () {
        state.karat = k; saveSettings(); renderKaratButtons(); renderResults();
      });
      wrap.appendChild(b);
    });
  }

  function showError(inputId, errId, show) {
    var err = $(errId);
    err.classList.toggle("show", !!show);
    $(inputId).classList.toggle("invalid", !!show);
  }

  function parseNum(str) {
    // accept both ASCII and Bengali digits
    var bn = "০১২৩৪৫৬৭৮৯";
    var s = String(str).trim().replace(/[০-৯]/g, function (d) { return bn.indexOf(d); });
    if (s === "") return NaN;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  function validate() {
    var rate = parseNum(state.rate);
    var weight = parseNum(state.weight);
    var making = parseNum(state.making);
    var ok = true;
    var rateBad = !(rate > 0);
    showError("rate", "err-rate", rateBad); ok = ok && !rateBad;
    var weightBad = !(weight > 0);
    showError("weight", "err-weight", weightBad); ok = ok && !weightBad;
    var makingBad = !(making >= 0 && making <= 100);
    showError("making", "err-making", makingBad); ok = ok && !makingBad;
    return ok ? { rate: rate, weight: weight, making: making } : null;
  }

  function currentValues() {
    var rate = parseNum(state.rate), weight = parseNum(state.weight), making = parseNum(state.making);
    if (!(rate > 0) || !(weight > 0) || !(making >= 0 && making <= 100)) return null;
    return { rate: rate, weight: weight, making: making };
  }

  function renderResults() {
    var v = currentValues();
    var box = $("results-box"), empty = $("results-empty"), filled = $("results-filled");
    if (!v) { box.classList.remove("show"); empty.hidden = false; filled.hidden = true; return; }
    var bhori = GC.toBhori(v.weight, state.unit);
    var bd = GC.breakdown(v.rate, state.karat, bhori, v.making);
    var lang = state.lang;
    $("r-weight").textContent =
      GC.fmtNum(bhori, lang, 4) + " " + t("unit_bhori") +
      "  (" + GC.fmtNum(GC.fromBhori(bhori, "gram"), lang, 3) + " " + t("unit_gram") + ")";
    $("r-rate").textContent = GC.fmtMoney(v.rate, lang);
    $("r-purity").textContent = (lang === "bn" ? GC.toBnDigits(String(state.karat)) : state.karat) +
      (lang === "bn" ? "⁄২৪" : "/24");
    $("r-base").textContent = GC.fmtMoney(bd.base, lang);
    $("r-making").textContent =
      GC.fmtMoney(bd.making, lang) +
      " (" + (lang === "bn" ? GC.toBnDigits(String(v.making)) : v.making) + "%)";
    $("r-total").textContent = GC.fmtMoney(bd.total, lang);
    // weight equivalence line
    $("weight-eq").textContent =
      t("weightEq") + ": " +
      GC.fmtNum(GC.fromBhori(bhori, "ana"), lang, 4) + " " + t("unit_ana") + " · " +
      GC.fmtNum(GC.fromBhori(bhori, "ratti"), lang, 4) + " " + t("unit_ratti") + " · " +
      GC.fmtNum(GC.fromBhori(bhori, "gram"), lang, 4) + " " + t("unit_gram");
    box.classList.add("show"); empty.hidden = true; filled.hidden = false;
  }

  function toast(msg) {
    var el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 2200);
  }

  function renderHistory() {
    var h = getHistory();
    var list = $("history-list"), empty = $("history-empty");
    list.innerHTML = "";
    empty.hidden = h.length > 0;
    $("history-count").textContent = state.lang === "bn" ? GC.toBnDigits(String(h.length)) : String(h.length);
    h.slice().reverse().forEach(function (e, revIdx) {
      var idx = h.length - 1 - revIdx;
      var li = document.createElement("li");
      li.className = "hist-item";
      var main = document.createElement("div");
      main.className = "hist-main";
      var r = document.createElement("div");
      r.className = "hist-rate";
      r.textContent = GC.fmtMoney(e.rate, state.lang) + " /" + t("unit_bhori");
      var d = document.createElement("div");
      d.className = "hist-date";
      var dateStr = state.lang === "bn" ? GC.toBnDigits(e.date) : e.date;
      d.textContent = dateStr + (e.note ? " · " + e.note : "");
      main.appendChild(r); main.appendChild(d);
      var del = document.createElement("button");
      del.type = "button"; del.className = "btn danger sm";
      del.textContent = t("deleteEntry");
      del.addEventListener("click", function () {
        if (!window.confirm(t("deleteConfirm"))) return;
        var hh = getHistory();
        hh.splice(idx, 1);
        setHistory(hh);
        renderHistory();
      });
      li.appendChild(main); li.appendChild(del);
      list.appendChild(li);
    });
  }

  function exportJSON() {
    return JSON.stringify(getHistory(), null, 2);
  }
  window.__exportJSON = exportJSON; // test hook

  function downloadExport() {
    var blob = new Blob([exportJSON()], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = t("exportName");
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function importFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("not array");
        var clean = data.filter(validEntry);
        if (clean.length !== data.length) throw new Error("bad entries");
        setHistory(clean);
        renderHistory();
        toast(t("importOk").replace("{n}", state.lang === "bn" ? GC.toBnDigits(String(clean.length)) : clean.length));
      } catch (e) {
        toast(t("importBad"));
      }
    };
    reader.readAsText(file);
  }

  function todayISO() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function init() {
    loadSettings();
    $("rate").value = state.rate;
    $("weight").value = state.weight;
    $("making").value = state.making;
    $("weight-unit").value = state.unit;
    $("hist-date").value = todayISO();

    $("rate").addEventListener("input", function (e) { state.rate = e.target.value; saveSettings(); renderResults(); });
    $("weight").addEventListener("input", function (e) { state.weight = e.target.value; saveSettings(); renderResults(); });
    $("making").addEventListener("input", function (e) { state.making = e.target.value; saveSettings(); renderResults(); });
    $("weight-unit").addEventListener("change", function (e) { state.unit = e.target.value; saveSettings(); renderResults(); });

    $("calc-form").addEventListener("submit", function (e) {
      e.preventDefault();
      // sync from DOM: values set programmatically (or by autofill) don't fire "input"
      state.rate = $("rate").value;
      state.weight = $("weight").value;
      state.making = $("making").value;
      state.unit = $("weight-unit").value;
      saveSettings();
      validate();
      renderResults();
    });

    $("lang-toggle").addEventListener("click", function () {
      state.lang = state.lang === "en" ? "bn" : "en";
      saveSettings();
      applyI18n();
    });

    $("save-rate").addEventListener("click", function () {
      var rate = parseNum($("rate").value);
      if (!(rate > 0)) { showError("rate", "err-rate", true); $("rate").focus(); return; }
      var date = $("hist-date").value || todayISO();
      var note = $("hist-note").value.trim();
      var h = getHistory();
      h.push({ rate: rate, date: date, note: note });
      setHistory(h);
      $("hist-note").value = "";
      renderHistory();
      toast(t("savedToast"));
    });

    $("export-btn").addEventListener("click", downloadExport);
    $("import-btn").addEventListener("click", function () { $("import-file").click(); });
    $("import-file").addEventListener("change", function (e) {
      if (e.target.files.length) importFile(e.target.files[0]);
      e.target.value = "";
    });

    $("clear-btn").addEventListener("click", function () {
      if (!window.confirm(t("clearConfirm"))) return;
      localStorage.removeItem(LS_SETTINGS);
      localStorage.removeItem(LS_HISTORY);
      state.rate = ""; state.weight = ""; state.making = "10"; state.karat = 22; state.unit = "bhori";
      $("rate").value = ""; $("weight").value = ""; $("making").value = "10";
      $("weight-unit").value = "bhori";
      ["rate","weight","making"].forEach(function (id) { showError(id, "err-" + id, false); });
      saveSettings();
      applyI18n();
      toast(t("cleared"));
    });

    applyI18n();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
