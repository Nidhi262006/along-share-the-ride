const test = require("node:test");
const assert = require("node:assert/strict");
const { moneyToPaise } = require("../services/money");

test("moneyToPaise converts rupees without floating-point drift", () => {
  assert.equal(moneyToPaise(150), 15000);
  assert.equal(moneyToPaise("12.34"), 1234);
  assert.equal(moneyToPaise(0.29), 29);
});

test("moneyToPaise rejects invalid, empty, excessive, and sub-paise amounts", () => {
  for (const value of ["", " ", null, undefined, NaN, Infinity, -0.01, 100000.01, 1.001, true]) {
    assert.equal(moneyToPaise(value), null, `expected ${String(value)} to be rejected`);
  }
});