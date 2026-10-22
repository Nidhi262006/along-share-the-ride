const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", required: true },
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  clientBookingId: { type: String, trim: true, maxlength: 80 },
  seats: { type: Number, default: 1, min: 1, validate: Number.isSafeInteger },
  farePerSeat: { type: Number, required: true, min: 0, max: 100000 },
  totalFare: { type: Number, required: true, min: 0, max: Number.MAX_SAFE_INTEGER / 100 },
  farePerSeatPaise: { type: Number, min: 0 },
  totalFarePaise: { type: Number, min: 0, max: Number.MAX_SAFE_INTEGER },
  pickup: { lat: Number, lng: Number, address: String },
  dropoff: { lat: Number, lng: Number, address: String },
  rideVersion: { type: Date },
  seatsReleasedAt: { type: Date, default: null },
  seatReleaseState: { type: String, enum: ["not_needed", "pending", "released"], default: "not_needed" },
  paymentMethod: { type: String, enum: ["offline"], default: "offline", required: true },
  paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending", required: true },
  status: { type: String, enum: ["pending", "confirmed", "cancelled", "rejected", "completed"], default: "pending" },
}, { timestamps: true });

bookingSchema.index(
  { ride: 1, passenger: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "confirmed"] } } }
);
bookingSchema.index({ passenger: 1, createdAt: -1 });
bookingSchema.index(
  { passenger: 1, clientBookingId: 1 },
  { unique: true, partialFilterExpression: { clientBookingId: { $type: "string" } } }
);

module.exports = mongoose.model("Booking", bookingSchema);