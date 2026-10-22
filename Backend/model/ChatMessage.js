const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  clientMessageId: { type: String, trim: true, maxlength: 80 },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

chatMessageSchema.index({ booking: 1, createdAt: 1 });
chatMessageSchema.index({ booking: 1, sender: 1, readBy: 1 });
chatMessageSchema.index(
  { booking: 1, sender: 1, clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $type: "string" } } }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);