const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../model/User");
const { requireAdmin } = require("../middleware/auth");
const { isConfiguredAdminEmail } = require("../services/adminIdentity");
const { provisionAdmin } = require("../services/provisionAdmin");

function runAdminMiddleware(user) {
  const response = {
    statusCode: 200,
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
  requireAdmin({ user }, response, () => { continued = true; });
  return { response, continued };
}

test("admin API access requires both the configured email and persisted admin role", () => {
  const previousEmail = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = "Owner@Example.com";
  try {
    assert.equal(isConfiguredAdminEmail("owner@example.com"), true);
    assert.equal(runAdminMiddleware({ email: "owner@example.com", role: "admin" }).continued, true);

    for (const user of [
      { email: "other@example.com", role: "admin" },
      { email: "owner@example.com", role: "passenger" },
      { email: "other@example.com", role: "passenger" },
    ]) {
      const result = runAdminMiddleware(user);
      assert.equal(result.continued, false);
      assert.equal(result.response.statusCode, 403);
    }
  } finally {
    if (previousEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousEmail;
  }
});

test("admin bootstrap promotes the existing configured account and demotes other admin roles", async () => {
  const previousEmail = process.env.ADMIN_EMAIL;
  const originalFindOne = User.findOne;
  const originalUpdateOne = User.updateOne;
  const originalUpdateMany = User.updateMany;
  const calls = [];
  process.env.ADMIN_EMAIL = "owner@example.com";
  User.findOne = async (query) => {
    assert.deepEqual(query, { email: "owner@example.com" });
    return { _id: "existing-account-id" };
  };
  User.updateOne = async (...args) => { calls.push(["promote", ...args]); };
  User.updateMany = async (...args) => { calls.push(["demote", ...args]); };

  try {
    await provisionAdmin();
    assert.deepEqual(calls, [
      ["promote", { _id: "existing-account-id" }, { $set: { role: "admin", modes: [] } }],
      ["demote", { role: "admin", _id: { $ne: "existing-account-id" } }, { $set: { role: "passenger" } }],
    ]);
  } finally {
    User.findOne = originalFindOne;
    User.updateOne = originalUpdateOne;
    User.updateMany = originalUpdateMany;
    if (previousEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousEmail;
  }
});

test("admin bootstrap refuses to create or promote an account when no existing account matches", async () => {
  const previousEmail = process.env.ADMIN_EMAIL;
  const originalFindOne = User.findOne;
  process.env.ADMIN_EMAIL = "missing@example.com";
  User.findOne = async () => null;
  try {
    await assert.rejects(provisionAdmin(), /must match an existing account/);
  } finally {
    User.findOne = originalFindOne;
    if (previousEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousEmail;
  }
});
