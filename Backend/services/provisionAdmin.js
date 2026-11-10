const User = require("../model/User");
const { normalizeAdminEmail } = require("./adminIdentity");

async function provisionAdmin() {
  const email = normalizeAdminEmail();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("ADMIN_EMAIL must be configured as a valid email address");
  }
  const existing = await User.findOne({ email });
  if (!existing) throw new Error("ADMIN_EMAIL must match an existing account; create and verify that account before starting the backend");

  await User.updateOne({ _id: existing._id }, { $set: { role: "admin", modes: [] } });
  await User.updateMany(
    { role: "admin", _id: { $ne: existing._id } },
    { $set: { role: "passenger" } }
  );
}

module.exports = { provisionAdmin };