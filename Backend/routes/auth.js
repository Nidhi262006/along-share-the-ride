const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { rateLimit } = require("express-rate-limit");
const User = require("../model/User");
const { TOKEN_COOKIE, requireAuth, requireRole } = require("../middleware/auth");
const { isConfiguredAdminEmail } = require("../services/adminIdentity");

const router = express.Router();
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const ALLOWED_ROLES = ["passenger", "driver"];
const ALLOWED_CITIES = ["bengaluru", "nagpur"];
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    modes: user.modes?.length ? user.modes : user.role === "admin" ? [] : [user.role],
    serviceCity: user.serviceCity || null,
    isVerified: user.isVerified,
    driverVerificationStatus: user.driverVerificationStatus || "not_submitted",
    driverRejectionReason: user.driverRejectionReason || "",
  };
}

function setSessionCookie(res, user) {
  const token = jwt.sign(
    { sub: user.id },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "8h" }
  );

  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS,
  });
}

function isDuplicateEmail(error) {
  return error?.code === 11000 && error?.keyPattern?.email;
}

router.post("/signup", credentialLimiter, async (req, res, next) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }
  if (name.length > 100) {
    return res.status(400).json({ message: "Name must be 100 characters or fewer" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "Password must be at least 8 characters and no more than 72 UTF-8 bytes" });
  }
  if (isConfiguredAdminEmail(email)) {
    return res.status(409).json({ message: "This email is reserved for the existing administrator account" });
  }

  try {
    if (await User.exists({ email })) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: "passenger" });
    setSessionCookie(res, user);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (isDuplicateEmail(error)) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    return next(error);
  }
});

router.post("/login", credentialLimiter, async (req, res, next) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  try {
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user.isSuspended) return res.status(403).json({ message: "This account has been suspended" });

    if (isConfiguredAdminEmail(user.email)) {
      if (user.role !== "admin" || user.modes?.length) {
        user.role = "admin";
        user.modes = [];
        await user.save();
      }
    } else if (user.role === "admin") {
      user.role = "passenger";
      await user.save();
    }

    setSessionCookie(res, user);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.patch("/role", requireAuth, async (req, res, next) => {
  const { role, serviceCity } = req.body ?? {};
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ message: "Role must be passenger or driver" });
  }
  if (!ALLOWED_CITIES.includes(serviceCity)) {
    return res.status(400).json({ message: "Choose Bengaluru or Nagpur as your service city" });
  }
  if (req.user.role === "admin") return res.status(403).json({ message: "Administrator accounts cannot switch to passenger or driver mode" });

  try {
    const existingModes = req.user.modes?.length ? req.user.modes : [req.user.role];
    req.user.role = role;
    req.user.serviceCity = serviceCity;
    req.user.modes = [...new Set([...existingModes.filter((mode) => ["passenger", "driver"].includes(mode)), role])];
    await req.user.save();
    return res.json({ user: publicUser(req.user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(TOKEN_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  res.json({ message: "Signed out" });
});

router.get("/passenger/me", requireAuth, requireRole("passenger"), (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.get("/driver/me", requireAuth, requireRole("driver"), (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;