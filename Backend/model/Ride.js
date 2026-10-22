const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  city: { type: String, enum: ["bengaluru", "nagpur"], required: true, index: true },
  pickup: { lat: Number, lng: Number, address: String },
  destination: { lat: Number, lng: Number, address: String },
  stops: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    order: { type: Number, required: true, min: 0 },
  }],
  seats: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  seatsAvailable: { type: Number, min: 0, default() { return this.seats; } },
  seatReleaseIds: { type: [{ type: mongoose.Schema.Types.ObjectId, select: false }], default: [], select: false },
  fare: { type: Number, required: true, min: 0, max: 100000 },
  instructions: { type: String, trim: true, maxlength: 500, default: "" },
  moderation: {
    reason: { type: String, trim: true, maxlength: 1000 },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    moderatedAt: { type: Date },
  },
  departureTime: { type: Date, required: true, index: true },
  status: { type: String, enum: ["open", "full", "completed", "cancelled"], default: "open" },
}, { timestamps: true });

rideSchema.index({ city: 1, status: 1, departureTime: 1 });
rideSchema.index({ driver: 1, departureTime: -1 });

module.exports = mongoose.model("Ride", rideSchema);