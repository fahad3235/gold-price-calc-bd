/* Node unit tests for Gold Price Calculator BD — pure math (js/calc.js). */
"use strict";
const assert = require("assert");
const GC = require("./js/calc.js");

let pass = 0, fail = 0;
function check(actual, expected, label) {
  try {
    assert.deepStrictEqual(actual, expected);
    pass++; console.log("  ok:", label);
  } catch (e) {
    fail++; console.error("FAIL:", label, "\n  expected:", expected, "\n  actual:  ", actual);
  }
}
function checkClose(actual, expected, label, eps) {
  eps = eps || 1e-9;
  if (Math.abs(actual - expected) <= eps) { pass++; console.log("  ok:", label); }
  else { fail++; console.error("FAIL:", label, "\n  expected:", expected, "\n  actual:  ", actual); }
}

console.log("== conversions ==");
check(GC.toBhori(1, "bhori"), 1, "1 bhori = 1 bhori");
check(GC.toBhori(16, "ana"), 1, "16 ana = 1 bhori");
check(GC.toBhori(96, "ratti"), 1, "96 ratti = 1 bhori");
checkClose(GC.toBhori(11.664, "gram"), 1, "11.664 g = 1 bhori");
check(GC.toBhori(8, "ana"), 0.5, "8 ana = 0.5 bhori");
checkClose(GC.toBhori(1, "ratti") * 11.664, 0.1215, "1 ratti = 0.1215 g");
check(GC.fromBhori(1, "ana"), 16, "1 bhori = 16 ana");
check(GC.fromBhori(1, "ratti"), 96, "1 bhori = 96 ratti");
check(GC.fromBhori(1, "gram"), 11.664, "1 bhori = 11.664 g");
checkClose(GC.fromBhori(GC.toBhori(2.5, "gram"), "gram"), 2.5, "gram round-trip");
checkClose(GC.fromBhori(GC.toBhori(33, "ratti"), "ana"), 5.5, "33 ratti = 5.5 ana");
check(Number.isNaN(GC.toBhori(1, "tola")), true, "unknown unit -> NaN");
check(Number.isNaN(GC.toBhori("abc", "ana")), true, "non-numeric -> NaN");

console.log("== pricing ==");
// HAND-VERIFIED: 2 bhori 22k @ 150000/bhori + 10% making = 302,500
let b = GC.breakdown(150000, 22, 2, 10);
check(b.base, 275000, "base = 2*150000*22/24 = 275,000");
check(b.making, 27500, "making = 275000*10% = 27,500");
check(b.total, 302500, "total = 302,500 EXACT");
check(b.purity, 22 / 24, "purity factor 22/24");
b = GC.breakdown(150000, 24, GC.toBhori(1, "ratti"), 0);
check(b.total, 1562.5, "1 ratti @150000/bhori 24k = 150000/96 = 1,562.50");
b = GC.breakdown(100000, 18, 1, 0);
check(b.total, 75000, "1 bhori 18k @100000 = 75,000");
b = GC.breakdown(100000, 24, 0.5, 5);
check(b.total, 52500, "0.5 bhori 24k +5% = 52,500");
b = GC.breakdown(200000, 21, GC.toBhori(8, "ana"), 0);
check(b.total, 87500, "8 ana 21k @200000 = 87,500");

console.log("== formatting ==");
check(GC.groupIndian("302500.00"), "3,02,500.00", "group 302500.00");
check(GC.groupIndian("1000"), "1,000", "group 1000");
check(GC.groupIndian("10000000"), "1,00,00,000", "group 1 crore");
check(GC.groupIndian("999"), "999", "group 999");
check(GC.toBnDigits("302500"), "৩০২৫০০", "bengali digits");
check(GC.fmtMoney(302500, "en"), "৳3,02,500.00", "fmtMoney EN");
check(GC.fmtMoney(302500, "bn"), "৳৩,০২,৫০০.০০", "fmtMoney BN bengali digits");
check(GC.fmtMoney(1562.5, "en"), "৳1,562.50", "fmtMoney 1562.50");

console.log(`\nunit: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
