const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  eventType: {
    type: String,
    enum: ["booking_requested", "booking_confirmed", "booking_cancelled", "ride_updated", "ride_cancelled", "ride_completed", "new_message", "driver_verification_approved", "driver_verification_rejected"],
    required: true,
  },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride" },
  title: { type: String, required: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 300 },
  dedupeKey: { type: String, required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1 });
notificationSchema.index({ recipient: 1, dedupeKey: 1 }, { unique: true });

module.exports = mongoose.model("Notification", notificationSchema);