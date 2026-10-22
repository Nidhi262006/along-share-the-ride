const mongoose = require("mongoose");

const adminActivitySchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true, maxlength: 80 },
  targetType: { type: String, enum: ["user", "ride", "report", "driver_application"], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

adminActivitySchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminActivity", adminActivitySchema);