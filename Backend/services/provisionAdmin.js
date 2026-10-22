const bcrypt = require("bcryptjs");
const User = require("../model/User");

async function provisionAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password || password.length < 16) {
    throw new Error("ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters are required together");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "admin") throw new Error("ADMIN_EMAIL belongs to a non-admin account; provision the admin deliberately in MongoDB");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name: "RouteMate Administrator", email, passwordHash, role: "admin", serviceCity: null });
}

module.exports = { provisionAdmin };