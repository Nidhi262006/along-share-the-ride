const Booking = require("../model/Booking");
const Ride = require("../model/Ride");

async function releaseBookingSeats(booking) {
  if (booking.seatReleaseState !== "pending") return;
  const rideId = booking.ride?._id || booking.ride;
  const bookingId = booking._id;
  const ride = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      status: { $in: ["open", "full"] },
      seatReleaseIds: { $ne: bookingId },
      $expr: { $lte: [{ $add: ["$seatsAvailable", booking.seats] }, "$seats"] },
    },
    [{ $set: {
      seatsAvailable: { $add: ["$seatsAvailable", booking.seats] },
      seatReleaseIds: { $concatArrays: [{ $ifNull: ["$seatReleaseIds", []] }, [bookingId]] },
      status: { $cond: [{ $gt: [{ $add: ["$seatsAvailable", booking.seats] }, 0] }, "open", "full"] },
    } }],
    { new: true, updatePipeline: true }
  );
  if (!ride) {
    const alreadyReleased = await Ride.exists({ _id: rideId, seatReleaseIds: bookingId });
    const rideClosed = await Ride.exists({ _id: rideId, status: { $in: ["cancelled", "completed"] } });
    if (!alreadyReleased && !rideClosed) throw new Error("Unable to release reserved ride seats");
  }
  await Booking.updateOne(
    { _id: bookingId, seatReleaseState: "pending" },
    { $set: { seatReleaseState: "released", seatsReleasedAt: new Date() } }
  );
}

module.exports = { releaseBookingSeats };