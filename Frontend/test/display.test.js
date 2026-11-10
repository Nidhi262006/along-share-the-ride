import test from "node:test";
import assert from "node:assert/strict";
import { formatPlace, getGreeting } from "../src/utils/display.js";

test("getGreeting follows local hours", () => {
  assert.equal(getGreeting(new Date(2026, 0, 1, 11)), "Good morning");
  assert.equal(getGreeting(new Date(2026, 0, 1, 12)), "Good afternoon");
  assert.equal(getGreeting(new Date(2026, 0, 1, 16)), "Good afternoon");
  assert.equal(getGreeting(new Date(2026, 0, 1, 17)), "Good evening");
});

test("formatPlace removes duplicate and generic address parts", () => {
  assert.equal(formatPlace("Sitabuldi Fort, Ramdaspeth, 440012, India"), "Sitabuldi Fort, Ramdaspeth");
  assert.equal(formatPlace("Central Park, central park, 560001, India"), "Central Park");
  assert.equal(formatPlace("Nagpur 440012, Ramdaspeth, Maharashtra, India"), "Nagpur, Ramdaspeth");
  assert.equal(formatPlace("Nagpur, Maharashtra, India", 2), "Nagpur");
});
