const express = require("express");
const mongoose = require("mongoose");
const Report = require("../model/Report");
const Ride = require("../model/Ride");
const User = require("../model/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.post("/", async (req, res, next) => {
  const { category, description, rideId, reportedUserId } = req.body || {};
  if (!req.user.serviceCity) return res.status(409).json({ message: "Choose a service city before submitting a report" });
  if (!["safety", "inappropriate_listing", "no_show", "other"].includes(category)) return res.status(400).json({ message: "Choose a report category" });
  if (typeof description !== "string" || description.trim().length < 20 || description.length > 2000) return res.status(400).json({ message: "Describe the issue in 20 to 2000 characters" });
  if (rideId && !mongoose.isValidObjectId(rideId)) return res.status(400).json({ message: "Invalid ride ID" });
  if (reportedUserId && !mongoose.isValidObjectId(reportedUserId)) return res.status(400).json({ message: "Invalid user ID" });
  try {
    let ride;
    if (rideId) {
      ride = await Ride.findOne({ _id: rideId, city: req.user.serviceCity });
      if (!ride) return res.status(404).json({ message: "Ride not found in your service city" });
    }
    if (reportedUserId && !(await User.exists({ _id: reportedUserId, serviceCity: req.user.serviceCity }))) {
      return res.status(404).json({ message: "Reported user not found in your service city" });
    }
    const report = await Report.create({
      reporter: req.user._id,
      ride: ride?._id,
      reportedUser: reportedUserId,
      category,
      description: description.trim(),
    });
    return res.status(201).json({ report: { id: report.id, status: report.status, createdAt: report.createdAt } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;