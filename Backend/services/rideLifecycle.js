const Booking = require("../model/Booking");
const Ride = require("../model/Ride");
const { createNotifications } = require("./notifications");
const { releaseBookingSeats } = require("./seatReservation");

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed"];

async function cancelDriverFutureRides(driverId) {
  const rides = await Ride.find({ driver: driverId, status: { $in: ["open", "full", "cancelled"] }, departureTime: { $gt: new Date() } });
  for (const ride of rides) {
    const cancelledRide = ["open", "full"].includes(ride.status)
      ? await Ride.findOneAndUpdate(
        { _id: ride._id, status: { $in: ["open", "full"] }, departureTime: { $gt: new Date() } },
        { $set: { status: "cancelled" } },
        { new: true }
      )
      : ride;
    if (!cancelledRide) continue;
    const bookings = await Booking.find({ ride: ride._id, status: { $in: ACTIVE_BOOKING_STATUSES } }).select("_id passenger");
    if (ride.status === "cancelled" && !bookings.length) continue;
    await Booking.updateMany(
      { ride: ride._id, status: { $in: ACTIVE_BOOKING_STATUSES } },
      { $set: { status: "cancelled" } }
    );
    const recipients = new Map([[String(driverId), driverId]]);
    bookings.forEach((booking) => recipients.set(String(booking.passenger), booking.passenger));
    await createNotifications([...recipients].map(([recipientId, recipient]) => ({
      recipient,
      eventType: "ride_cancelled",
      ride: ride._id,
      title: "Ride cancelled",
      message: "This ride was cancelled because driver eligibility changed.",
      dedupeKey: `ride_cancelled:${ride._id}:${cancelledRide.updatedAt.getTime()}:${recipientId}`,
    })));
  }
}

async function cancelPassengerBookings(passengerId) {
  const bookings = await Booking.find({
    passenger: passengerId,
    $or: [
      { status: { $in: ACTIVE_BOOKING_STATUSES } },
      { status: "cancelled", seatReleaseState: "pending" },
    ],
  })
    .populate({ path: "ride", select: "driver city pickup destination seats seatsAvailable status departureTime" });
  for (const booking of bookings) {
    if (booking.status === "cancelled" && booking.seatReleaseState === "pending") {
      if (!booking.ride) continue;
      await releaseBookingSeats(booking);
      await createNotifications([{
        recipient: booking.ride.driver,
        eventType: "booking_cancelled",
        booking: booking._id,
        ride: booking.ride._id,
        title: "Booking cancelled",
        message: "A passenger booking was cancelled because the passenger account was suspended.",
        dedupeKey: `booking_cancelled:${booking._id}:${booking.ride.driver}`,
      }]);
      continue;
    }
    if (booking.ride && ["cancelled", "completed"].includes(booking.ride.status)) {
      await Booking.updateOne(
        { _id: booking._id, status: { $in: ACTIVE_BOOKING_STATUSES } },
        { $set: { status: booking.ride.status === "completed" ? "completed" : "cancelled", seatReleaseState: "not_needed" } }
      );
      continue;
    }
    if (!booking.ride || booking.ride.departureTime <= new Date() || !["open", "full"].includes(booking.ride.status)) continue;
    const cancelledBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, passenger: passengerId, status: { $in: ACTIVE_BOOKING_STATUSES } },
      { $set: { status: "cancelled", seatReleaseState: "pending" } },
      { new: true }
    );
    if (!cancelledBooking) continue;
    await releaseBookingSeats(cancelledBooking);
    await createNotifications([
      {
        recipient: booking.ride.driver,
        eventType: "booking_cancelled",
        booking: booking._id,
        ride: booking.ride._id,
        title: "Booking cancelled",
        message: "A passenger booking was cancelled because the passenger account was suspended.",
        dedupeKey: `booking_cancelled:${booking._id}:${booking.ride.driver}`,
      },
    ]);
  }
}

module.exports = { cancelDriverFutureRides, cancelPassengerBookings };