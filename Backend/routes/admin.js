const express = require("express");
const mongoose = require("mongoose");
const User = require("../model/User");
const Ride = require("../model/Ride");
const Booking = require("../model/Booking");
const DriverDocument = require("../model/DriverDocument");
const Report = require("../model/Report");
const AdminActivity = require("../model/AdminActivity");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { createNotifications } = require("../services/notifications");
const { cancelDriverFutureRides, cancelPassengerBookings } = require("../services/rideLifecycle");

const router = express.Router();
const DOCUMENT_TYPES = ["license", "government_id", "vehicle_rc"];
router.use(requireAuth, requireAdmin);

function safeSearch(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 100);
}

async function audit(req, action, targetType, targetId, details = {}) {
  await AdminActivity.create({ admin: req.user._id, action, targetType, targetId, details });
}

router.get("/overview", async (_req, res, next) => {
  try {
    const now = new Date();
    const [totalUsers, passengers, drivers, activeRides, upcomingRides, bookings, pendingDrivers, unresolvedReports, activity] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      User.countDocuments({ $or: [{ role: "passenger" }, { modes: "passenger" }] }),
      User.countDocuments({ $or: [{ role: "driver" }, { modes: "driver" }] }),
      Ride.countDocuments({ status: { $in: ["open", "full"] } }),
      Ride.countDocuments({ status: { $in: ["open", "full"] }, departureTime: { $gt: now } }),
      Booking.countDocuments(),
      User.countDocuments({ driverVerificationStatus: "pending" }),
      Report.countDocuments({ status: { $in: ["open", "investigating"] } }),
      AdminActivity.find().sort({ createdAt: -1 }).limit(20).populate("admin", "name email"),
    ]);
    return res.json({ stats: { totalUsers, passengers, drivers, activeRides, upcomingRides, bookings, pendingDrivers, unresolvedReports }, activity });
  } catch (error) {
    return next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const filter = { role: { $ne: "admin" } };
    const filters = [];
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const expression = new RegExp(safeSearch(req.query.search.trim()), "i");
      filters.push({ $or: [{ name: expression }, { email: expression }] });
    }
    if (["passenger", "driver"].includes(req.query.role)) filters.push({ $or: [{ role: req.query.role }, { modes: req.query.role }] });
    if (filters.length) filter.$and = filters;
    if (req.query.suspended === "true") filter.isSuspended = true;
    if (req.query.suspended === "false") filter.isSuspended = { $ne: true };
    const users = await User.find(filter).select("name email role modes serviceCity isVerified isSuspended driverVerificationStatus driverRejectionReason createdAt").sort({ createdAt: -1 }).limit(100);
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
});

router.get("/users/:userId", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ message: "Invalid user ID" });
  try {
    const user = await User.findById(req.params.userId).select("-passwordHash");
    if (!user || user.role === "admin") return res.status(404).json({ message: "User not found" });
    const [rides, bookings] = await Promise.all([
      Ride.find({ driver: user._id }).sort({ departureTime: -1 }).limit(50),
      Booking.find({ passenger: user._id }).populate("ride", "pickup destination departureTime fare city status").sort({ createdAt: -1 }).limit(50),
    ]);
    return res.json({ user, rides, bookings: bookings.filter((booking) => booking.ride) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/users/:userId/suspension", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.userId)) return res.status(400).json({ message: "Invalid user ID" });
  if (req.body?.confirmed !== true || typeof req.body?.suspended !== "boolean") return res.status(400).json({ message: "Explicit confirmation and a suspension state are required" });
  if (req.body.suspended && String(req.params.userId) === String(req.user._id)) return res.status(400).json({ message: "Administrators cannot suspend their own account" });
  try {
    const user = await User.findOne({ _id: req.params.userId, role: { $ne: "admin" } });
    if (!user) return res.status(404).json({ message: "User not found" });
    const changed = user.isSuspended !== req.body.suspended;
    if (!changed && !req.body.suspended) return res.status(409).json({ message: "Account is already active" });
    if (changed) {
      user.isSuspended = req.body.suspended;
      await user.save();
    }
    const modes = new Set(user.modes?.length ? user.modes : [user.role]);
    if (user.isSuspended && modes.has("driver")) await cancelDriverFutureRides(user._id);
    if (user.isSuspended && modes.has("passenger")) await cancelPassengerBookings(user._id);
    if (changed) await audit(req, user.isSuspended ? "user_suspended" : "user_reactivated", "user", user._id, { role: user.role });
    return res.json({ user: { id: user.id, isSuspended: user.isSuspended } });
  } catch (error) {
    return next(error);
  }
});

router.get("/drivers/applications", async (_req, res, next) => {
  try {
    const users = await User.find({
      $and: [
        { $or: [{ role: "driver" }, { modes: "driver" }] },
        { $or: [{ driverVerificationStatus: { $in: ["pending", "approved", "rejected"] } }, { isVerified: true }] },
      ],
    })
      .select("name email serviceCity driverProfile driverVerificationStatus driverRejectionReason driverVerificationSubmittedAt driverVerificationReviewedBy driverVerificationReviewedAt isSuspended createdAt updatedAt")
      .sort({ updatedAt: -1 });
    const applications = await Promise.all(users.map(async (user) => ({
      user: await user.populate("driverVerificationReviewedBy", "name email"),
      documents: await DriverDocument.find({ driver: user._id }).select("type originalName contentType revision status rejectionReason createdAt").sort({ type: 1, revision: -1 }),
    })));
    return res.json({ applications });
  } catch (error) {
    return next(error);
  }
});

router.get("/drivers/:driverId/documents/:documentId", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.driverId) || !mongoose.isValidObjectId(req.params.documentId)) return res.status(400).json({ message: "Invalid document reference" });
  try {
    const document = await DriverDocument.findOne({ _id: req.params.documentId, driver: req.params.driverId }).select("+fileData");
    if (!document?.fileData) return res.status(404).json({ message: "Document not found" });
    res.set({
      "Content-Type": document.contentType,
      "Content-Disposition": "inline; filename=driver-document",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    return res.send(document.fileData);
  } catch (error) {
    return next(error);
  }
});

router.patch("/drivers/:driverId/verification", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.driverId)) return res.status(400).json({ message: "Invalid driver ID" });
  const { status, rejectionReason, confirmed } = req.body || {};
  if (confirmed !== true || !["approved", "rejected"].includes(status)) return res.status(400).json({ message: "Confirm an approval or rejection decision" });
  if (status === "rejected" && (typeof rejectionReason !== "string" || rejectionReason.trim().length < 5 || rejectionReason.length > 1000)) {
    return res.status(400).json({ message: "Provide a rejection reason of 5 to 1000 characters" });
  }
  try {
    const driver = await User.findOne({ _id: req.params.driverId, $or: [{ role: "driver" }, { modes: "driver" }] });
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    if (driver.isSuspended) return res.status(409).json({ message: "Suspended accounts cannot be approved" });
    if (driver.driverVerificationStatus !== "pending") return res.status(409).json({ message: "Only pending applications can be reviewed" });
    if (status === "approved") {
      const latestDocuments = await DriverDocument.aggregate([
        { $match: { driver: driver._id } },
        { $sort: { revision: -1, createdAt: -1 } },
        { $group: { _id: "$type", status: { $first: "$status" } } },
      ]);
      if (DOCUMENT_TYPES.some((type) => !latestDocuments.some((document) => document._id === type && document.status === "pending"))) {
        return res.status(409).json({ message: "The latest revision of all required driver documents must be submitted for review" });
      }
    }
    driver.driverVerificationStatus = status;
    driver.driverRejectionReason = status === "rejected" ? rejectionReason.trim() : "";
    driver.isVerified = status === "approved";
    driver.driverVerificationReviewedBy = req.user._id;
    driver.driverVerificationReviewedAt = new Date();
    await driver.save();
    await DriverDocument.updateMany(
      { driver: driver._id, status: "pending" },
      { $set: { status, rejectionReason: status === "rejected" ? driver.driverRejectionReason : "" } }
    );
    if (status === "rejected" && driver.isVerified === false) await cancelDriverFutureRides(driver._id);
    await createNotifications([{
      recipient: driver._id,
      eventType: status === "approved" ? "driver_verification_approved" : "driver_verification_rejected",
      title: status === "approved" ? "Driver verification approved" : "Driver verification needs changes",
      message: status === "approved" ? "Your driver application was approved. You can now post rides." : `Your application was rejected: ${driver.driverRejectionReason}`.slice(0, 300),
      dedupeKey: `driver_verification:${driver._id}:${driver.updatedAt.getTime()}`,
    }]);
    await audit(req, `driver_verification_${status}`, "driver_application", driver._id, { rejectionReason: driver.driverRejectionReason });
    return res.json({ status: driver.driverVerificationStatus, rejectionReason: driver.driverRejectionReason });
  } catch (error) {
    return next(error);
  }
});

router.get("/rides", async (req, res, next) => {
  try {
    const filter = {};
    if (["bengaluru", "nagpur"].includes(req.query.city)) filter.city = req.query.city;
    if (["open", "full", "completed", "cancelled"].includes(req.query.status)) filter.status = req.query.status;
    const rides = await Ride.find(filter).populate("driver", "name email isSuspended driverVerificationStatus").sort({ departureTime: -1 }).limit(100);
    return res.json({ rides });
  } catch (error) {
    return next(error);
  }
});

router.patch("/rides/:rideId/moderation", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.rideId)) return res.status(400).json({ message: "Invalid ride ID" });
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (req.body?.confirmed !== true || reason.length < 5 || reason.length > 1000) return res.status(400).json({ message: "Confirm moderation and provide a reason" });
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    if (["open", "full"].includes(ride.status)) {
      const cancelled = await Ride.findOneAndUpdate(
        { _id: ride._id, status: { $in: ["open", "full"] } },
        { $set: { status: "cancelled", moderation: { reason, moderatedBy: req.user._id, moderatedAt: new Date() } } },
        { new: true }
      );
      if (!cancelled) return res.status(409).json({ message: "Ride changed while moderation was in progress" });
      const bookings = await Booking.find({ ride: ride._id, status: { $in: ["pending", "confirmed"] } }).select("_id passenger");
      await Booking.updateMany({ ride: ride._id, status: { $in: ["pending", "confirmed"] } }, { $set: { status: "cancelled" } });
      const recipients = new Set([String(ride.driver), ...bookings.map((booking) => String(booking.passenger))]);
      await createNotifications([...recipients].map((recipient) => ({
        recipient,
        eventType: "ride_cancelled",
        ride: ride._id,
        title: "Ride removed by moderation",
        message: `A ride listing was removed: ${reason}`,
        dedupeKey: `admin_ride_cancelled:${ride._id}:${cancelled.updatedAt.getTime()}:${recipient}`,
      })));
    } else {
      ride.moderation = { reason, moderatedBy: req.user._id, moderatedAt: new Date() };
      await ride.save();
    }
    await audit(req, "ride_moderated", "ride", ride._id, { reason });
    return res.json({ ride: await Ride.findById(ride._id) });
  } catch (error) {
    return next(error);
  }
});

router.get("/reports", async (req, res, next) => {
  try {
    const filter = ["open", "investigating", "resolved", "dismissed"].includes(req.query.status) ? { status: req.query.status } : {};
    const reports = await Report.find(filter).populate("reporter", "name email").populate("reportedUser", "name email").populate("ride", "pickup destination city departureTime status").sort({ createdAt: -1 }).limit(100);
    return res.json({ reports });
  } catch (error) {
    return next(error);
  }
});

router.patch("/reports/:reportId", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.reportId)) return res.status(400).json({ message: "Invalid report ID" });
  const { status, resolution, confirmed } = req.body || {};
  if (confirmed !== true || !["investigating", "resolved", "dismissed"].includes(status)) return res.status(400).json({ message: "Confirm a valid report status" });
  if (["resolved", "dismissed"].includes(status) && (typeof resolution !== "string" || resolution.trim().length < 5 || resolution.length > 2000)) {
    return res.status(400).json({ message: "Provide a resolution of 5 to 2000 characters" });
  }
  try {
    const report = await Report.findByIdAndUpdate(req.params.reportId, {
      $set: { status, resolution: resolution?.trim() || "", resolvedBy: req.user._id },
    }, { new: true, runValidators: true });
    if (!report) return res.status(404).json({ message: "Report not found" });
    await audit(req, "report_updated", "report", report._id, { status, resolution: report.resolution });
    return res.json({ report });
  } catch (error) {
    return next(error);
  }
});

router.get("/activity", async (_req, res, next) => {
  try {
    const activity = await AdminActivity.find().populate("admin", "name email").sort({ createdAt: -1 }).limit(100);
    return res.json({ activity });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;