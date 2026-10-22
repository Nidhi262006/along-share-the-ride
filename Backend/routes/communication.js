const express = require("express");
const mongoose = require("mongoose");
const Booking = require("../model/Booking");
const ChatMessage = require("../model/ChatMessage");
const Notification = require("../model/Notification");
const Ride = require("../model/Ride");
const { requireAuth } = require("../middleware/auth");
const { createNotifications } = require("../services/notifications");

const router = express.Router();
const notificationRouter = express.Router();
const CHAT_STATUSES = ["confirmed", "cancelled", "completed"];

router.use(requireAuth);
notificationRouter.use(requireAuth);

async function getParticipantBooking(req, bookingId) {
  if (!mongoose.isValidObjectId(bookingId)) return null;
  const booking = await Booking.findOne({ _id: bookingId, status: { $in: CHAT_STATUSES } })
    .populate({ path: "ride", match: { city: req.user.serviceCity }, select: "driver city pickup destination departureTime status" });
  if (!booking?.ride) return null;
  const driverId = String(booking.ride.driver);
  if (String(booking.passenger) !== String(req.user._id) && driverId !== String(req.user._id)) return null;
  return { booking, driverId, passengerId: String(booking.passenger) };
}

router.get("/conversations", async (req, res, next) => {
  try {
    let rides = [];
    if (req.user.role === "driver") {
      rides = await Ride.find({ driver: req.user._id, city: req.user.serviceCity }).select("_id");
    }
    const bookingFilter = req.user.role === "passenger"
      ? { passenger: req.user._id, status: { $in: CHAT_STATUSES } }
      : { ride: { $in: rides.map((ride) => ride._id) }, status: { $in: CHAT_STATUSES } };
    const bookings = await Booking.find(bookingFilter)
      .populate({ path: "ride", match: { city: req.user.serviceCity }, populate: [
        { path: "driver", select: "name" },
      ] })
      .populate("passenger", "name")
      .sort({ updatedAt: -1 });
    const visible = bookings.filter((booking) => booking.ride);
    const conversations = await Promise.all(visible.map(async (booking) => {
      const otherParticipant = req.user.role === "driver" ? booking.passenger : booking.ride.driver;
      const [latestMessage, unreadCount] = await Promise.all([
        ChatMessage.findOne({ booking: booking._id }).sort({ createdAt: -1 }),
        ChatMessage.countDocuments({ booking: booking._id, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } }),
      ]);
      return {
        booking: { _id: booking._id, status: booking.status },
        ride: {
          _id: booking.ride._id,
          pickup: booking.ride.pickup,
          destination: booking.ride.destination,
          departureTime: booking.ride.departureTime,
        },
        participant: otherParticipant ? { id: otherParticipant._id, name: otherParticipant.name } : null,
        latestMessage,
        unreadCount,
        canSend: booking.status === "confirmed" && booking.ride.status !== "cancelled",
      };
    }));
    return res.json({ conversations });
  } catch (error) {
    return next(error);
  }
});

router.get("/:bookingId/messages", async (req, res, next) => {
  try {
    const participant = await getParticipantBooking(req, req.params.bookingId);
    if (!participant) return res.status(404).json({ message: "Conversation not found" });
    let before;
    if (req.query.before !== undefined) {
      before = new Date(req.query.before);
      if (!Number.isFinite(before.getTime())) return res.status(400).json({ message: "Invalid message history cursor" });
    }
    const filter = { booking: participant.booking._id };
    if (before) filter.createdAt = { $lt: before };
    const messages = await ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("sender", "name");
    const unreadIds = messages
      .filter((message) => String(message.sender._id) !== String(req.user._id)
        && !message.readBy.some((reader) => String(reader) === String(req.user._id)))
      .map((message) => message._id);
    if (unreadIds.length) {
      await ChatMessage.updateMany(
        { _id: { $in: unreadIds }, booking: participant.booking._id },
        { $addToSet: { readBy: req.user._id } }
      );
    }
    return res.json({
      messages: messages.reverse(),
      hasMore: messages.length === 100,
      bookingStatus: participant.booking.status,
      canSend: participant.booking.status === "confirmed" && participant.booking.ride.status !== "cancelled",
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:bookingId/messages", async (req, res, next) => {
  try {
    const participant = await getParticipantBooking(req, req.params.bookingId);
    if (!participant) return res.status(404).json({ message: "Conversation not found" });
    if (participant.booking.status !== "confirmed" || participant.booking.ride.status === "cancelled") {
      return res.status(409).json({ message: "Messages are read-only for cancelled or completed bookings" });
    }
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text || text.length > 2000) return res.status(400).json({ message: "Message must be 1 to 2000 characters" });
    const clientMessageId = req.body?.clientMessageId;
    if (clientMessageId !== undefined && (typeof clientMessageId !== "string" || !clientMessageId.trim() || clientMessageId.length > 80)) {
      return res.status(400).json({ message: "Invalid message request ID" });
    }
    const messageFields = {
      booking: participant.booking._id,
      sender: req.user._id,
      ...(clientMessageId ? { clientMessageId: clientMessageId.trim() } : {}),
      text,
      readBy: [req.user._id],
    };
    const message = clientMessageId
      ? await ChatMessage.findOneAndUpdate(
        { booking: participant.booking._id, sender: req.user._id, clientMessageId: clientMessageId.trim() },
        { $setOnInsert: messageFields },
        { new: true, upsert: true, runValidators: true }
      )
      : await ChatMessage.create(messageFields);
    const recipient = String(req.user._id) === participant.passengerId ? participant.driverId : participant.passengerId;
    await createNotifications([{
      recipient,
      eventType: "new_message",
      booking: participant.booking._id,
      ride: participant.booking.ride._id,
      title: "New ride message",
      message: text.length > 100 ? `${text.slice(0, 97)}...` : text,
      dedupeKey: `message:${message._id}`,
    }]);
    await message.populate("sender", "name");
    return res.status(201).json({ message });
  } catch (error) {
    return next(error);
  }
});

notificationRouter.get("/", async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(100),
      Notification.countDocuments({ recipient: req.user._id, readAt: null }),
    ]);
    return res.json({ notifications, unreadCount });
  } catch (error) {
    return next(error);
  }
});

notificationRouter.patch("/read-all", async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    return res.json({ message: "Notifications marked as read" });
  } catch (error) {
    return next(error);
  }
});

notificationRouter.patch("/:notificationId/read", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.notificationId)) return res.status(400).json({ message: "Invalid notification ID" });
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, recipient: req.user._id, readAt: null },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    return res.json({ notification });
  } catch (error) {
    return next(error);
  }
});

module.exports = { chatRouter: router, notificationRouter };