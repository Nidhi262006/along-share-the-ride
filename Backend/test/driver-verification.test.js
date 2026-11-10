const test = require("node:test");
const assert = require("node:assert/strict");
const { requireApprovedDriver } = require("../middleware/auth");
const User = require("../model/User");

function runMiddleware(user) {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let continued = false;
  requireApprovedDriver({ user }, response, () => { continued = true; });
  return { response, continued };
}

test("only explicitly approved driver accounts can pass ride-posting authorization", () => {
  assert.equal(runMiddleware({ role: "driver", driverVerificationStatus: "approved" }).continued, true);

  for (const user of [
    { role: "driver", driverVerificationStatus: "pending" },
    { role: "driver", driverVerificationStatus: "rejected" },
    { role: "driver", driverVerificationStatus: "not_submitted", isVerified: true },
    { role: "passenger", driverVerificationStatus: "approved" },
  ]) {
    const result = runMiddleware(user);
    assert.equal(result.continued, false);
    assert.equal(result.response.statusCode, 403);
  }
});

test("driver verification review metadata is persisted on users", () => {
  assert.ok(User.schema.path("driverVerificationSubmittedAt"));
  assert.ok(User.schema.path("driverVerificationReviewedBy"));
  assert.ok(User.schema.path("driverVerificationReviewedAt"));
});
