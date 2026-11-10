const mongoose = require("mongoose");

const rideRequestSchema = new mongoose.Schema({
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  city: { type: String, enum: ["bengaluru", "nagpur"], required: true, index: true },
  pickup: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true, trim: true, maxlength: 200 },
  },
  destination: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true, trim: true, maxlength: 200 },
  },
  departureTime: { type: Date, required: true, index: true },
  passengers: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  note: { type: String, trim: true, maxlength: 500, default: "" },
  maxFarePerSeat: { type: Number, min: 0, max: 100000, default: null },
  status: { type: String, enum: ["open", "accepted", "cancelled"], default: "open", index: true },
  declinedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  acceptedRide: { type: mongoose.Schema.Types.ObjectId, ref: "Ride", default: null },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
}, { timestamps: true });

rideRequestSchema.index({ city:  1, status: 1, departureTime: 1 });
rideRequestSchema.index({ passenger: 1, createdAt: -1 });

module.exports = mongoose.model("RideRequest", rideRequestSchema);
