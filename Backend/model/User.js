const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["passenger", "driver", "admin"], default: "passenger" },
  modes: { type: [{ type: String, enum: ["passenger", "driver"] }], default: undefined },
  serviceCity: { type: String, enum: ["bengaluru", "nagpur"], default: null },
  isVerified: { type: Boolean, default: false },
  isSuspended: { type: Boolean, default: false, index: true },
  driverProfile: {
    phone: { type: String, trim: true, maxlength: 30 },
    licenseNumber: { type: String, trim: true, maxlength: 80 },
    vehicleMake: { type: String, trim: true, maxlength: 80 },
    vehicleModel: { type: String, trim: true, maxlength: 80 },
    vehicleRegistration: { type: String, trim: true, maxlength: 30 },
  },
  driverVerificationStatus: {
    type: String,
    enum: ["not_submitted", "pending", "approved", "rejected"],
    default: "not_submitted",
    index: true,
  },
  driverRejectionReason: { type: String, trim: true, maxlength: 1000, default: "" },
  driverVerificationSubmittedAt: { type: Date, default: null },
  driverVerificationReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  driverVerificationReviewedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);