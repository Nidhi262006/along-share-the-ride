const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  category: { type: String, enum: ["safety", "inappropriate_listing", "no_show", "other"], required: true },
  description: { type: String, required: true, trim: true, minlength: 20, maxlength: 2000 },
  status: { type: String, enum: ["open", "investigating", "resolved", "dismissed"], default: "open", index: true },
  resolution: { type: String, trim: true, maxlength: 2000, default: "" },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);