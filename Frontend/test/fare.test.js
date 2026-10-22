import test from "node:test";
import assert from "node:assert/strict";
import { splitFareInPaise } from "../src/utils/fare.js";

test("equal fare splits divide a three-seat booking evenly", () => {
  assert.deepEqual(splitFareInPaise(45000, 3), [{ people: 3, eachPaise: 15000 }]);
});

test("uneven splits assign remainder paise and sum exactly", () => {
  const shares = splitFareInPaise(10000, 3);
  assert.deepEqual(shares, [{ people: 1, eachPaise: 3334 }, { people: 2, eachPaise: 3333 }]);
  assert.equal(shares.reduce((sum, share) => sum + share.people * share.eachPaise, 0), 10000);
});

test("fare split rejects invalid amounts and seat counts", () => {
  assert.throws(() => splitFareInPaise(-1, 2));
  assert.throws(() => splitFareInPaise(100, 0));
  assert.throws(() => splitFareInPaise(1.5, 2));
});