/* Gold Price Calculator BD — pure math module.
 * Loaded by index.html (window.GoldCalc) and by the node unit tests (module.exports).
 * All conversions are exact by definition:
 *   1 bhori = 11.664 g
 *   1 bhori = 16 ana
 *   1 ana   = 6 ratti   =>  1 ratti = 11.664 / 96 = 0.1215 g
 */
"use strict";

var GoldCalc = (function () {
  var GRAM_PER_BHORI = 11.664;
  var ANA_PER_BHORI = 16;
  var RATTI_PER_ANA = 6;
  var RATTI_PER_BHORI = 96; // 16 * 6

  function toBhori(amount, unit) {
    var a = Number(amount);
    if (!isFinite(a)) return NaN;
    switch (unit) {
      case "bhori": return a;
      case "ana":   return a / ANA_PER_BHORI;
      case "ratti": return a / RATTI_PER_BHORI;
      case "gram":  return a / GRAM_PER_BHORI;
      default: return NaN;
    }
  }

  function fromBhori(bhori, unit) {
    var b = Number(bhori);
    if (!isFinite(b)) return NaN;
    switch (unit) {
      case "bhori": return b;
      case "ana":   return b * ANA_PER_BHORI;
      case "ratti": return b * RATTI_PER_BHORI;
      case "gram":  return b * GRAM_PER_BHORI;
      default: return NaN;
    }
  }

  // rate: BDT per bhori for 24k; karat: 24/22/21/18; makingPct: 0-100
  function breakdown(rate, karat, weightBhori, makingPct) {
    var purity = karat / 24;
    var base = weightBhori * rate * purity;
    var making = base * (makingPct / 100);
    return {
      purity: purity,
      base: base,
      making: making,
      total: base + making
    };
  }

  // Indian-style grouping: last 3 digits, then groups of 2. "302500.00" -> "3,02,500.00"
  function groupIndian(numStr) {
    var parts = String(numStr).split(".");
    var int = parts[0];
    var dec = parts.length > 1 ? "." + parts[1] : "";
    if (int.length <= 3) return int + dec;
    var last3 = int.slice(-3);
    var rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    return rest + "," + last3 + dec;
  }

  var BN_DIGITS = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
  function toBnDigits(str) {
    return String(str).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }

  // BDT money string. lang: "en" | "bn"
  function fmtMoney(amount, lang) {
    var rounded = (Math.round(amount * 100) / 100).toFixed(2);
    var s = "৳" + groupIndian(rounded);
    return lang === "bn" ? toBnDigits(s) : s;
  }

  function fmtNum(amount, lang, decimals) {
    var d = decimals == null ? 2 : decimals;
    var s = groupIndian(Number(amount).toFixed(d));
    return lang === "bn" ? toBnDigits(s) : s;
  }

  return {
    GRAM_PER_BHORI: GRAM_PER_BHORI,
    ANA_PER_BHORI: ANA_PER_BHORI,
    RATTI_PER_ANA: RATTI_PER_ANA,
    RATTI_PER_BHORI: RATTI_PER_BHORI,
    toBhori: toBhori,
    fromBhori: fromBhori,
    breakdown: breakdown,
    groupIndian: groupIndian,
    toBnDigits: toBnDigits,
    fmtMoney: fmtMoney,
    fmtNum: fmtNum
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = GoldCalc;
if (typeof window !== "undefined") window.GoldCalc = GoldCalc;
