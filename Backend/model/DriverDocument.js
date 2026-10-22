const mongoose = require("mongoose");

const driverDocumentSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["license", "government_id", "vehicle_rc"], required: true },
  fileUrl: { type: String },
  fileData: { type: Buffer, select: false },
  contentType: { type: String, enum: ["image/jpeg", "image/png", "application/pdf"] },
  originalName: { type: String, trim: true, maxlength: 200 },
  revision: { type: Number, default: 1, min: 1 },
  revisionKey: { type: String, select: false },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  rejectionReason: { type: String, trim: true, maxlength: 1000, default: "" },
}, { timestamps: true });

driverDocumentSchema.index({ driver: 1, type: 1, revision: -1 });
driverDocumentSchema.index(
  { revisionKey: 1 },
  { unique: true, partialFilterExpression: { revisionKey: { $type: "string" } } }
);

module.exports = mongoose.model("DriverDocument", driverDocumentSchema);