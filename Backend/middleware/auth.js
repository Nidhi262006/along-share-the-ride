const jwt = require("jsonwebtoken");
const User = require("../model/User");
const { isConfiguredAdminEmail } = require("../services/adminIdentity");

const TOKEN_COOKIE = "routemate_token";

async function requireAuth(req, res, next) {
  const token = req.cookies?.[TOKEN_COOKIE];
  if (!token) {
    return res.status(401).json({ message: "Please sign in to continue" });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({ message: "Your session is invalid or has expired" });
  }

  try {
    const user = await User.findById(payload.sub).select("name email role modes isVerified isSuspended serviceCity driverProfile driverVerificationStatus driverRejectionReason driverVerificationSubmittedAt driverVerificationReviewedBy driverVerificationReviewedAt");
    if (!user) {
      return res.status(401).json({ message: "Your session is invalid or has expired" });
    }
    if (user.isSuspended) return res.status(403).json({ message: "This account has been suspended" });
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin" || !isConfiguredAdminEmail(req.user.email)) {
    return res.status(403).json({ message: "Administrator access is required" });
  }
  return next();
}

function requireApprovedDriver(req, res, next) {
  if (req.user?.role !== "driver") return res.status(403).json({ message: "Driver access is required" });
  if (req.user.driverVerificationStatus !== "approved") {
    return res.status(403).json({ message: "Driver verification approval is required before posting rides" });
  }
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have access to this resource" });
    }
    return next();
  };
}

module.exports = { TOKEN_COOKIE, requireAuth, requireRole, requireAdmin, requireApprovedDriver };