function normalizeAdminEmail(value = process.env.ADMIN_EMAIL) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function isConfiguredAdminEmail(value) {
  const adminEmail = normalizeAdminEmail();
  return Boolean(adminEmail && typeof value === "string" && value.trim().toLowerCase() === adminEmail);
}

module.exports = { normalizeAdminEmail, isConfiguredAdminEmail };
