const express = require("express");
const mongoose = require("mongoose");
const Booking = require("../model/Booking");
const Ride = require("../model/Ride");
const RideRequest = require("../model/RideRequest");
const User = require("../model/User");
const { requireAuth, requireRole, requireApprovedDriver } = require("../middleware/auth");
const { matchRides, validateRideWaypoints } = require("../services/routeMatching");
const { createNotifications } = require("../services/notifications");
const { moneyToPaise } = require("../services/money");
const { releaseBookingSeats } = require("../services/seatReservation");

const router = express.Router();
const DEPARTURE_WINDOW_MINUTES = Number.isFinite(Number(process.env.RIDE_MATCH_DEPARTURE_WINDOW_MINUTES))
  && Number(process.env.RIDE_MATCH_DEPARTURE_WINDOW_MINUTES) > 0
  ? Number(process.env.RIDE_MATCH_DEPARTURE_WINDOW_MINUTES)
  : 60;
const CITY_BOUNDS = {
  bengaluru: { minLat: 12.5, maxLat: 13.4, minLng: 77.2, maxLng: 77.9, label: "Bengaluru" },
  nagpur: { minLat: 20.7, maxLat: 21.5, minLng: 78.5, maxLng: 79.8, label: "Nagpur" },
};
const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed"];

function assignedCity(req, res) {
  if (!CITY_BOUNDS[req.user.serviceCity]) {
    res.status(409).json({ message: "Choose a service city in your profile before using rides" });
    return null;
  }
  return req.user.serviceCity;
}

function validPoint(point, city, fieldName) {
  const bounds = CITY_BOUNDS[city];
  if (!point || typeof point.address !== "string") return `${fieldName} address is required`;
  const address = point.address.trim();
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  if (address.length < 3 || address.length > 200) return `${fieldName} address must be 3 to 200 characters`;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return `${fieldName} coordinates are required`;
  if (lat < bounds.minLat || lat > bounds.maxLat || lng < bounds.minLng || lng > bounds.maxLng) {
    return `${fieldName} must be within the ${bounds.label} service area`;
  }
  const cityPattern = city === "bengaluru" ? /bengaluru|bangalore/i : /nagpur/i;
  if (!cityPattern.test(address)) return `${fieldName} address must identify ${bounds.label}`;
  return null;
}

function validateRideInput(body, city, { partial = false } = {}) {
  const fields = {};
  if (!partial || body.pickup !== undefined) {
    const error = validPoint(body.pickup, city, "Pickup");
    if (error) return { error };
    fields.pickup = { lat: Number(body.pickup.lat), lng: Number(body.pickup.lng), address: body.pickup.address.trim() };
  }
  if (!partial || body.destination !== undefined) {
    const error = validPoint(body.destination, city, "Destination");
    if (error) return { error };
    fields.destination = { lat: Number(body.destination.lat), lng: Number(body.destination.lng), address: body.destination.address.trim() };
  }
  if (body.stops !== undefined) {
    if (!Array.isArray(body.stops) || body.stops.length > 20) return { error: "Stops must be an ordered list of at most 20 locations" };
    const stops = [];
    for (const [order, stop] of body.stops.entries()) {
      const error = validPoint(stop, city, `Stop ${order + 1}`);
      if (error) return { error };
      stops.push({ lat: Number(stop.lat), lng: Number(stop.lng), address: stop.address.trim(), order });
    }
    fields.stops = stops;
  } else if (!partial) {
    fields.stops = [];
  }
  if (!partial || body.departureTime !== undefined) {
    const departureTime = new Date(body.departureTime);
    if (!Number.isFinite(departureTime.getTime()) || departureTime <= new Date()) {
      return { error: "Departure time must be a valid future date and time" };
    }
    fields.departureTime = departureTime;
  }
  if (!partial || body.seats !== undefined) {
    const seats = Number(body.seats);
    if (!Number.isSafeInteger(seats) || seats < 1) return { error: "Seats must be a positive whole number" };
    fields.seats = seats;
  }
  if (!partial || body.fare !== undefined) {
    const farePaise = moneyToPaise(body.fare);
    if (farePaise === null) return { error: "Fare must be between 0 and 100000 with at most two decimal places" };
    fields.fare = farePaise / 100;
  }
  if (body.instructions !== undefined) {
    if (typeof body.instructions !== "string" || body.instructions.trim().length > 500) {
      return { error: "Instructions must be 500 characters or fewer" };
    }
    fields.instructions = body.instructions.trim();
  } else if (!partial) {
    fields.instructions = "";
  }
  return { fields };
}

function publicRide(ride) {
  return ride;
}

function comparableRideField(field, value) {
  if (field === "pickup" || field === "destination") {
    return value ? { lat: Number(value.lat), lng: Number(value.lng), address: value.address } : null;
  }
  if (field === "stops") {
    return (value || []).map((stop, order) => ({
      lat: Number(stop.lat),
      lng: Number(stop.lng),
      address: stop.address,
      order: Number.isInteger(stop.order) ? stop.order : order,
    })).sort((first, second) => first.order - second.order);
  }
  return value;
}

function sameRideField(field, first, second) {
  return JSON.stringify(comparableRideField(field, first)) === JSON.stringify(comparableRideField(field, second));
}

function closeToPostedPoint(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDifference = radians(Number(first.lat) - Number(second.lat));
  const longitudeDifference = radians(Number(first.lng) - Number(second.lng));
  const firstLatitude = radians(Number(first.lat));
  const secondLatitude = radians(Number(second.lat));
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDifference / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) <= 100;
}

function restoreSeats(rideId, seats) {
  return Ride.findOneAndUpdate(
    {
      _id: rideId,
      status: { $in: ["open", "full"] },
      $expr: { $lte: [{ $add: ["$seatsAvailable", seats] }, "$seats"] },
    },
    { $inc: { seatsAvailable: seats }, $set: { status: "open" } },
    { new: true }
  );
}

router.use(requireAuth);

router.post("/", requireRole("driver"), requireApprovedDriver, async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  const { fields, error } = validateRideInput(req.body || {}, city);
  if (error) return res.status(400).json({ message: error });

  try {
    try {
      await validateRideWaypoints([fields.pickup, ...fields.stops, fields.destination]);
    } catch {
      return res.status(503).json({ message: "Road route validation is unavailable. Please try again before posting this ride." });
    }
    const ride = await Ride.create({ ...fields, city, driver: req.user._id, seatsAvailable: fields.seats });
    await ride.populate("driver", "name isVerified");
    return res.status(201).json({ ride: publicRide(ride) });
  } catch (requestError) {
    return next(requestError);
  }
});

router.get("/mine", requireRole("driver"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  try {
    const rides = await Ride.find({ driver: req.user._id, city }).sort({ departureTime: -1 });
    return res.json({ rides });
  } catch (error) {
    return next(error);
  }
});

router.get("/bookings", requireRole("passenger"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  try {
    const bookings = await Booking.find({ passenger: req.user._id })
      .populate({ path: "ride", match: { city }, populate: { path: "driver", select: "name isVerified" } })
      .sort({ createdAt: -1 });
    return res.json({ bookings: bookings.filter((booking) => booking.ride) });
  } catch (error) {
    return next(error);
  }
});

router.post("/requests", requireRole("passenger"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  const body = req.body || {};
  const pickupError = validPoint(body.pickup, city, "Pickup");
  const destinationError = validPoint(body.destination, city, "Destination");
  if (pickupError || destinationError) return res.status(400).json({ message: pickupError || destinationError });
  const departureTime = new Date(body.departureTime);
  if (!Number.isFinite(departureTime.getTime()) || departureTime <= new Date()) {
    return res.status(400).json({ message: "Departure time must be a valid future date and time" });
  }
  const passengers = Number(body.passengers);
  if (!Number.isSafeInteger(passengers) || passengers < 1) {
    return res.status(400).json({ message: "Passengers must be a positive whole number" });
  }
  if (body.note !== undefined && (typeof body.note !== "string" || body.note.trim().length > 500)) {
    return res.status(400).json({ message: "Note must be 500 characters or fewer" });
  }
  let maxFarePerSeat = null;
  if (body.maxFarePerSeat !== undefined && body.maxFarePerSeat !== null && body.maxFarePerSeat !== "") {
    const farePaise = moneyToPaise(body.maxFarePerSeat);
    if (farePaise === null) return res.status(400).json({ message: "Maximum fare must be between 0 and 100000 with at most two decimal places" });
    maxFarePerSeat = farePaise / 100;
  }
  try {
    const rideRequest = await RideRequest.create({
      passenger: req.user._id,
      city,
      pickup: { lat: Number(body.pickup.lat), lng: Number(body.pickup.lng), address: body.pickup.address.trim() },
      destination: { lat: Number(body.destination.lat), lng: Number(body.destination.lng), address: body.destination.address.trim() },
      departureTime,
      passengers,
      note: body.note?.trim() || "",
      maxFarePerSeat,
    });
    return res.status(201).json({ request: rideRequest });
  } catch (error) {
    return next(error);
  }
});

router.get("/requests/mine", requireRole("passenger"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  try {
    const requests = await RideRequest.find({ passenger: req.user._id, city })
      .populate({ path: "acceptedRide", select: "departureTime fare" })
      .populate({ path: "booking", select: "status" })
      .sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (error) {
    return next(error);
  }
});

router.patch("/requests/:requestId/cancel", requireRole("passenger"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  if (!mongoose.isValidObjectId(req.params.requestId)) return res.status(400).json({ message: "Invalid ride request ID" });
  try {
    const rideRequest = await RideRequest.findOneAndUpdate(
      { _id: req.params.requestId, passenger: req.user._id, city, status: "open" },
      { $set: { status: "cancelled" } },
      { new: true }
    );
    if (!rideRequest) return res.status(404).json({ message: "Open ride request not found" });
    return res.json({ request: rideRequest });
  } catch (error) {
    return next(error);
  }
});

router.get("/requests/open", requireRole("driver"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  try {
    const requests = await RideRequest.find({
      city,
      passenger: { $ne: req.user._id },
      status: "open",
      departureTime: { $gt: new Date() },
      declinedBy: { $ne: req.user._id },
    }).populate("passenger", "name").sort({ departureTime: 1 });
    return res.json({ requests });
  } catch (error) {
    return next(error);
  }
});

router.post("/requests/:requestId/decline", requireRole("driver"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  if (!mongoose.isValidObjectId(req.params.requestId)) return res.status(400).json({ message: "Invalid ride request ID" });
  try {
    const rideRequest = await RideRequest.findOneAndUpdate(
      { _id: req.params.requestId, city, status: "open", passenger: { $ne: req.user._id } },
      { $addToSet: { declinedBy: req.user._id } },
      { new: true }
    );
    if (!rideRequest) return res.status(404).json({ message: "Open passenger request not found" });
    return res.json({ request: rideRequest });
  } catch (error) {
    return next(error);
  }
});

router.post("/requests/:requestId/accept", requireRole("driver"), requireApprovedDriver, async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  if (!mongoose.isValidObjectId(req.params.requestId) || !mongoose.isValidObjectId(req.body?.rideId)) {
    return res.status(400).json({ message: "A valid ride request and ride ID are required" });
  }
  try {
    const rideRequest = await RideRequest.findOne({
      _id: req.params.requestId,
      city,
      status: "open",
      passenger: { $ne: req.user._id },
      declinedBy: { $ne: req.user._id },
      departureTime: { $gt: new Date() },
    });
    if (!rideRequest) return res.status(404).json({ message: "Open passenger request not found" });
    const activePassenger = await User.exists({ _id: rideRequest.passenger, role: "passenger", isSuspended: { $ne: true } });
    if (!activePassenger) return res.status(409).json({ message: "The passenger is no longer available" });
    const ride = await Ride.findOne({
      _id: req.body.rideId,
      driver: req.user._id,
      city,
      status: "open",
      departureTime: { $gt: new Date() },
      seatsAvailable: { $gte: rideRequest.passengers },
    });
    if (!ride) return res.status(409).json({ message: "Choose an upcoming ride with enough available seats" });
    if (Math.abs(ride.departureTime.getTime() - rideRequest.departureTime.getTime()) > DEPARTURE_WINDOW_MINUTES * 60 * 1000) {
      return res.status(409).json({ message: "Choose a ride departing near the passenger's requested time" });
    }
    if (rideRequest.maxFarePerSeat !== null && ride.fare > rideRequest.maxFarePerSeat) {
      return res.status(409).json({ message: "This ride's fare is above the passenger's maximum" });
    }
    const routeResult = await matchRides([ride], {
      pickup: { lat: rideRequest.pickup.lat, lng: rideRequest.pickup.lng },
      destination: { lat: rideRequest.destination.lat, lng: rideRequest.destination.lng },
    }, "departure");
    if (!routeResult.matching.available) return res.status(503).json({ message: "Road route validation is unavailable. Try again before accepting." });
    if (!routeResult.rides.length) return res.status(409).json({ message: "This ride does not fit the passenger's requested route" });

    const pendingBooking = await Booking.exists({
      ride: ride._id,
      passenger: rideRequest.passenger,
      status: "pending",
    });
    if (pendingBooking) return res.status(409).json({ message: "The passenger already has a booking awaiting review for this ride" });
    const existingBooking = await Booking.findOne({
      ride: ride._id,
      passenger: rideRequest.passenger,
      status: "confirmed",
    });
    if (existingBooking && existingBooking.seats < rideRequest.passengers) {
      return res.status(409).json({ message: "The passenger already has a smaller active booking on this ride" });
    }
    if (existingBooking && (!existingBooking.pickup || !existingBooking.dropoff
      || !closeToPostedPoint(existingBooking.pickup, rideRequest.pickup)
      || !closeToPostedPoint(existingBooking.dropoff, rideRequest.destination))) {
      return res.status(409).json({ message: "The passenger has a different route on this ride already" });
    }

    let booking = existingBooking;
    if (!booking) {
      const reservedRide = await Ride.findOneAndUpdate(
        {
          _id: ride._id,
          driver: req.user._id,
          city,
          updatedAt: ride.updatedAt,
          status: "open",
          departureTime: { $gt: new Date() },
          seatsAvailable: { $gte: rideRequest.passengers },
        },
        [{ $set: {
          seatsAvailable: { $subtract: ["$seatsAvailable", rideRequest.passengers] },
          status: { $cond: [{ $eq: [{ $subtract: ["$seatsAvailable", rideRequest.passengers] }, 0] }, "full", "open"] },
        } }],
        { new: true, updatePipeline: true }
      );
      if (!reservedRide) return res.status(409).json({ message: "This ride no longer has enough seats" });
      const farePerSeatPaise = moneyToPaise(reservedRide.fare);
      const totalFarePaise = farePerSeatPaise === null ? null : farePerSeatPaise * rideRequest.passengers;
      if (farePerSeatPaise === null || !Number.isSafeInteger(totalFarePaise)) {
        await restoreSeats(reservedRide._id, rideRequest.passengers);
        return res.status(409).json({ message: "This ride has an invalid fare and cannot be booked" });
      }
      try {
        [booking] = await Booking.create([{
          ride: reservedRide._id,
          passenger: rideRequest.passenger,
          seats: rideRequest.passengers,
          pickup: rideRequest.pickup,
          dropoff: rideRequest.destination,
          rideVersion: ride.updatedAt,
          farePerSeat: farePerSeatPaise / 100,
          totalFare: totalFarePaise / 100,
          farePerSeatPaise,
          totalFarePaise,
          paymentMethod: "offline",
          paymentStatus: "pending",
          status: "confirmed",
        }]);
      } catch (error) {
        await restoreSeats(reservedRide._id, rideRequest.passengers);
        if (error?.code === 11000) return res.status(409).json({ message: "The passenger already has an active booking for this ride" });
        throw error;
      }
    }

    const accepted = await RideRequest.findOneAndUpdate(
      { _id: rideRequest._id, status: "open", declinedBy: { $ne: req.user._id } },
      { $set: { status: "accepted", acceptedRide: ride._id, booking: booking._id } },
      { new: true }
    );
    if (!accepted) {
      if (!existingBooking) {
        await Booking.updateOne({ _id: booking._id, status: "confirmed" }, { $set: { status: "cancelled", seatReleaseState: "pending" } });
        await releaseBookingSeats({ ...booking.toObject(), ride: ride._id, seatReleaseState: "pending" });
      }
      return res.status(409).json({ message: "This passenger request has already been accepted or cancelled" });
    }
    await createNotifications([{
      recipient: rideRequest.passenger,
      eventType: "booking_confirmed",
      booking: booking._id,
      ride: ride._id,
      title: "Ride request accepted",
      message: "A driver accepted your ride request. Your booking is confirmed.",
      dedupeKey: `ride_request_accepted:${rideRequest._id}:${rideRequest.passenger}`,
    }]);
    await booking.populate({ path: "ride", populate: { path: "driver", select: "name isVerified" } });
    return res.json({ request: accepted, booking });
  } catch (error) {
    return next(error);
  }
});

router.post("/:rideId/bookings", requireRole("passenger"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  if (!mongoose.isValidObjectId(req.params.rideId)) return res.status(400).json({ message: "Invalid ride ID" });
  const seats = Number(req.body?.seats);
  if (!Number.isSafeInteger(seats) || seats < 1) {
    return res.status(400).json({ message: "Choose a positive whole number of seats" });
  }
  const clientBookingId = req.body?.clientBookingId;
  if (clientBookingId !== undefined && (typeof clientBookingId !== "string" || !clientBookingId.trim() || clientBookingId.length > 80)) {
    return res.status(400).json({ message: "Invalid booking request ID" });
  }
  try {
    if (clientBookingId) {
      const previousBooking = await Booking.findOne({ passenger: req.user._id, clientBookingId: clientBookingId.trim() })
        .populate({ path: "ride", match: { city }, populate: { path: "driver", select: "name isVerified" } });
      if (previousBooking) {
        if (String(previousBooking.ride?._id) !== req.params.rideId) return res.status(409).json({ message: "Booking request ID was already used for another ride" });
        return res.status(200).json({ booking: previousBooking });
      }
    }
    const candidate = await Ride.findOne({ _id: req.params.rideId, city });
    if (!candidate) return res.status(404).json({ message: "Ride not found in your selected city" });
    const eligibleDriver = await User.exists({
      _id: candidate.driver,
      isSuspended: { $ne: true },
      driverVerificationStatus: "approved",
    });
    if (!eligibleDriver) return res.status(409).json({ message: "This driver is not currently eligible for bookings" });
    if (req.body?.expectedUpdatedAt !== undefined) {
      const expectedTime = new Date(req.body.expectedUpdatedAt);
      if (!Number.isFinite(expectedTime.getTime())) return res.status(400).json({ message: "Invalid ride version" });
      if (expectedTime.getTime() !== candidate.updatedAt.getTime()
        || Number(req.body.expectedFarePaise) !== moneyToPaise(candidate.fare)
        || Number(req.body.expectedSeatsAvailable) !== candidate.seatsAvailable) {
        return res.status(409).json({ message: "Ride fare, route, or capacity changed. Review the updated ride before confirming." });
      }
    }
    const driverId = candidate.driver?._id || candidate.driver?.id || candidate.driver;
    if (String(driverId) === String(req.user._id)) {
      return res.status(403).json({ message: "You can't book your own ride" });
    }
    if (candidate.status !== "open") return res.status(409).json({ message: "This ride is not available for booking" });
    if (candidate.departureTime <= new Date()) return res.status(409).json({ message: "This ride has already departed" });
    if (candidate.seatsAvailable < seats) return res.status(409).json({ message: "Not enough seats are available" });
    const hasPickupProposal = req.body?.pickup !== undefined;
    const hasDropoffProposal = req.body?.dropoff !== undefined;
    if (hasPickupProposal !== hasDropoffProposal) return res.status(400).json({ message: "Pickup and drop-off proposals must be supplied together" });
    let agreedPickup = candidate.pickup;
    let agreedDropoff = candidate.destination;
    let requiresDriverDecision = false;
    if (hasPickupProposal) {
      const pickupError = validPoint(req.body.pickup, city, "Pickup");
      const dropoffError = validPoint(req.body.dropoff, city, "Drop-off");
      if (pickupError || dropoffError) return res.status(400).json({ message: pickupError || dropoffError });
      const routeResult = await matchRides([candidate], {
        pickup: { lat: Number(req.body.pickup.lat), lng: Number(req.body.pickup.lng) },
        destination: { lat: Number(req.body.dropoff.lat), lng: Number(req.body.dropoff.lng) },
      }, "departure");
      if (!routeResult.matching.available) return res.status(503).json({ message: "Road route validation is unavailable. Please try again before booking." });
      if (!routeResult.rides.length) return res.status(409).json({ message: "Those pickup and drop-off points do not fit this ride's route. Review the route and try again." });
      agreedPickup = { lat: Number(req.body.pickup.lat), lng: Number(req.body.pickup.lng), address: req.body.pickup.address.trim() };
      agreedDropoff = { lat: Number(req.body.dropoff.lat), lng: Number(req.body.dropoff.lng), address: req.body.dropoff.address.trim() };
      requiresDriverDecision = !closeToPostedPoint(agreedPickup, candidate.pickup)
        || !closeToPostedPoint(agreedDropoff, candidate.destination);
    }
    const candidateFarePaise = moneyToPaise(candidate.fare);
    if (candidateFarePaise === null) {
      return res.status(409).json({ message: "This ride has an invalid fare and cannot be booked" });
    }

    const ride = await Ride.findOneAndUpdate(
      {
        _id: req.params.rideId,
        city,
        updatedAt: candidate.updatedAt,
        driver: { $ne: req.user._id },
        status: "open",
        departureTime: { $gt: new Date() },
        seatsAvailable: { $gte: seats },
      },
      [{ $set: {
        seatsAvailable: { $subtract: ["$seatsAvailable", seats] },
        status: { $cond: [{ $eq: [{ $subtract: ["$seatsAvailable", seats] }, 0] }, "full", "open"] },
      } }],
      { new: true, updatePipeline: true }
    );
    if (!ride) return res.status(409).json({ message: "This ride is no longer available or does not have enough seats" });
    const farePerSeatPaise = moneyToPaise(ride.fare);
    const totalFarePaise = farePerSeatPaise === null ? null : farePerSeatPaise * seats;
    if (farePerSeatPaise === null || !Number.isSafeInteger(totalFarePaise)) {
      await restoreSeats(ride._id, seats);
      return res.status(409).json({ message: "This ride has an invalid fare and cannot be booked" });
    }
    const farePerSeat = farePerSeatPaise / 100;
    const totalFare = totalFarePaise / 100;

    let booking;
    try {
      [booking] = await Booking.create([{
        ride: ride._id,
        passenger: req.user._id,
        ...(clientBookingId ? { clientBookingId: clientBookingId.trim() } : {}),
        seats,
        pickup: agreedPickup,
        dropoff: agreedDropoff,
        rideVersion: candidate.updatedAt,
        farePerSeat,
        totalFare,
        farePerSeatPaise,
        totalFarePaise,
        paymentMethod: "offline",
        paymentStatus: "pending",
        status: requiresDriverDecision ? "pending" : "confirmed",
      }]);
    } catch (error) {
      await restoreSeats(ride._id, seats);
      if (error?.code === 11000) return res.status(409).json({ message: "You already have an active booking for this ride" });
      throw error;
    }

    const currentRide = await Ride.findOne({ _id: ride._id, city, status: { $in: ["open", "full"] } });
    if (!currentRide) {
      await Booking.updateOne({ _id: booking._id, status: "confirmed" }, { $set: { status: "cancelled" } });
      return res.status(409).json({ message: "This ride was cancelled while you were booking" });
    }
    const bookingNotification = {
      eventType: requiresDriverDecision ? "booking_requested" : "booking_confirmed",
      booking: booking._id,
      ride: ride._id,
      title: requiresDriverDecision ? "Pickup and drop-off request" : "Ride booking confirmed",
      message: requiresDriverDecision
        ? `A passenger requested ${seats} seat${seats === 1 ? "" : "s"} with a route proposal. Review and accept or reject it.`
        : `${seats} seat${seats === 1 ? "" : "s"} booked. Your ride details are in My rides.`,
    };
    const notificationRecipients = requiresDriverDecision ? [ride.driver] : [req.user._id, ride.driver];
    await createNotifications(notificationRecipients.map((recipient) => ({
      ...bookingNotification,
      recipient,
      dedupeKey: `${bookingNotification.eventType}:${booking._id}:${recipient}`,
    })));
    await booking.populate({ path: "ride", populate: { path: "driver", select: "name isVerified" } });
    return res.status(201).json({ booking });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:rideId/bookings/:bookingId/decision", requireRole("driver"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  if (!mongoose.isValidObjectId(req.params.rideId) || !mongoose.isValidObjectId(req.params.bookingId)) {
    return res.status(400).json({ message: "Invalid booking or ride ID" });
  }
  const { decision } = req.body || {};
  if (!["accept", "reject"].includes(decision)) return res.status(400).json({ message: "Decision must be accept or reject" });
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, driver: req.user._id, city, status: { $in: ["open", "full"] } });
    if (!ride) return res.status(404).json({ message: "Active ride not found" });
    const booking = await Booking.findOne({ _id: req.params.bookingId, ride: ride._id, status: "pending" });
    if (!booking) {
      const rejectedBooking = decision === "reject"
        ? await Booking.findOne({ _id: req.params.bookingId, ride: ride._id, status: "rejected", seatReleaseState: "pending" })
        : null;
      if (!rejectedBooking) return res.status(404).json({ message: "Pending route request not found" });
      await releaseBookingSeats(rejectedBooking);
      await createNotifications([{
        recipient: rejectedBooking.passenger,
        eventType: "booking_cancelled",
        booking: rejectedBooking._id,
        ride: ride._id,
        title: "Route request declined",
        message: "The driver declined your proposed pickup and drop-off. No offline payment was collected.",
        dedupeKey: `booking_decision:${rejectedBooking._id}:reject:${rejectedBooking.passenger}`,
      }]);
      return res.json({ booking: rejectedBooking });
    }
    if (ride.departureTime <= new Date()) return res.status(409).json({ message: "This ride has already departed" });
    if (decision === "accept") {
      const passenger = await mongoose.model("User").findById(booking.passenger).select("isSuspended");
      if (!passenger || passenger.isSuspended) return res.status(409).json({ message: "Passenger is unavailable" });
      const routeResult = await matchRides([ride], {
        pickup: { lat: booking.pickup.lat, lng: booking.pickup.lng },
        destination: { lat: booking.dropoff.lat, lng: booking.dropoff.lng },
      }, "departure");
      if (!routeResult.matching.available) return res.status(503).json({ message: "Road route validation is unavailable. Try again before accepting." });
      if (!routeResult.rides.length) return res.status(409).json({ message: "The proposed stops no longer fit this ride's route" });
    }
    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, ride: ride._id, status: "pending" },
      { $set: {
        status: decision === "accept" ? "confirmed" : "rejected",
        seatReleaseState: decision === "reject" ? "pending" : "not_needed",
      } },
      { new: true }
    );
    if (!updatedBooking) return res.status(409).json({ message: "This route request has already been reviewed" });
    if (decision === "reject") await releaseBookingSeats(updatedBooking);
    const eventType = decision === "accept" ? "booking_confirmed" : "booking_cancelled";
    const decisionNotification = {
      eventType,
      booking: booking._id,
      ride: ride._id,
      title: decision === "accept" ? "Route request accepted" : "Route request declined",
      message: decision === "accept" ? "The driver accepted your proposed pickup and drop-off. Your booking is confirmed." : "The driver declined your proposed pickup and drop-off. No offline payment was collected.",
    };
    const recipients = decision === "accept" ? [booking.passenger, req.user._id] : [booking.passenger];
    await createNotifications(recipients.map((recipient) => ({
      ...decisionNotification,
      recipient,
      dedupeKey: `booking_decision:${booking._id}:${decision}:${recipient}`,
    })));
    return res.json({ booking: updatedBooking });
  } catch (error) {
    return next(error);
  }
});

router.patch("/bookings/:bookingId/cancel", requireRole("passenger"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  if (!mongoose.isValidObjectId(req.params.bookingId)) return res.status(400).json({ message: "Invalid booking ID" });
  try {
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      passenger: req.user._id,
      status: { $in: [...ACTIVE_BOOKING_STATUSES, "cancelled"] },
    }).populate({ path: "ride", match: { city } });
    if (!booking || !booking.ride) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "cancelled") {
      await releaseBookingSeats(booking);
      const retryNotice = {
        eventType: "booking_cancelled",
        booking: booking._id,
        ride: booking.ride._id,
        title: "Booking cancelled",
        message: `${booking.seats} seat${booking.seats === 1 ? "" : "s"} for this ride was cancelled.`,
      };
      await createNotifications([
        { ...retryNotice, recipient: req.user._id, dedupeKey: `booking_cancelled:${booking._id}:${req.user._id}` },
        { ...retryNotice, recipient: booking.ride.driver, dedupeKey: `booking_cancelled:${booking._id}:${booking.ride.driver}` },
      ]);
      return res.json({ booking });
    }
    if (booking.ride.departureTime <= new Date()) return res.status(409).json({ message: "A departed ride booking cannot be cancelled" });
    const claimed = await Booking.findOneAndUpdate(
      { _id: booking._id, passenger: req.user._id, status: { $in: ACTIVE_BOOKING_STATUSES } },
      { $set: { status: "cancelled", seatReleaseState: "pending" } },
      { new: true }
    );
    if (!claimed) return res.status(409).json({ message: "This booking is no longer active" });
    await releaseBookingSeats(claimed);
    const cancellationNotification = {
      eventType: "booking_cancelled",
      booking: claimed._id,
      ride: booking.ride._id,
      title: "Booking cancelled",
      message: `${booking.seats} seat${booking.seats === 1 ? "" : "s"} for this ride was cancelled.`,
    };
    await createNotifications([
      { ...cancellationNotification, recipient: req.user._id, dedupeKey: `booking_cancelled:${claimed._id}:${req.user._id}` },
      { ...cancellationNotification, recipient: booking.ride.driver, dedupeKey: `booking_cancelled:${claimed._id}:${booking.ride.driver}` },
    ]);
    return res.json({ booking: claimed });
  } catch (error) {
    return next(error);
  }
});

router.get("/", requireRole("passenger"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  const filter = { city, status: "open", seatsAvailable: { $gt: 0 }, departureTime: { $gt: new Date() } };
  const hasPickup = typeof req.query.pickup === "string" && req.query.pickup.trim();
  const hasDestination = typeof req.query.destination === "string" && req.query.destination.trim();
  const hasRouteRequest = Boolean(hasPickup || hasDestination);
  if (hasRouteRequest && (!hasPickup || !hasDestination)) {
    return res.status(400).json({ message: "Enter both pickup and destination to match a route" });
  }

  let requestPoints;
  if (hasRouteRequest) {
    const pickupError = validPoint({
      address: req.query.pickup,
      lat: req.query.pickupLat,
      lng: req.query.pickupLng,
    }, city, "Pickup");
    const destinationError = validPoint({
      address: req.query.destination,
      lat: req.query.destinationLat,
      lng: req.query.destinationLng,
    }, city, "Destination");
    if (pickupError || destinationError) {
      return res.status(400).json({ message: pickupError || destinationError });
    }
    requestPoints = {
      pickup: { lat: Number(req.query.pickupLat), lng: Number(req.query.pickupLng) },
      destination: { lat: Number(req.query.destinationLat), lng: Number(req.query.destinationLng) },
    };
  }

  if (req.query.seats !== undefined) {
    const seats = Number(req.query.seats);
    if (!Number.isSafeInteger(seats) || seats < 1) {
      return res.status(400).json({ message: "Choose a positive whole number of seats" });
    }
    filter.seatsAvailable.$gte = seats;
  }

  if (req.query.departureTime !== undefined) {
    const requestedTime = new Date(req.query.departureTime);
    if (!Number.isFinite(requestedTime.getTime()) || requestedTime <= new Date()) {
      return res.status(400).json({ message: "Choose a valid future departure date and time" });
    }
    const windowMilliseconds = DEPARTURE_WINDOW_MINUTES * 60 * 1000;
    filter.departureTime = {
      $gte: new Date(requestedTime.getTime() - windowMilliseconds),
      $lte: new Date(requestedTime.getTime() + windowMilliseconds),
      $gt: new Date(),
    };
  } else if (req.query.date !== undefined) {
    if (typeof req.query.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
      return res.status(400).json({ message: "Choose a valid departure date" });
    }
    const start = new Date(`${req.query.date}T00:00:00`);
    if (Number.isNaN(start.getTime())) return res.status(400).json({ message: "Choose a valid departure date" });
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    filter.departureTime = { $gte: start, $lt: end, $gt: new Date() };
  }
  const sort = req.query.sort === "fare" ? { fare: 1, departureTime: 1 }
    : req.query.sort === "availability" ? { seatsAvailable: -1, departureTime: 1 }
      : { departureTime: 1 };
  try {
    const rides = await Ride.find(filter)
      .populate({
        path: "driver",
        match: {
          isSuspended: { $ne: true },
          driverVerificationStatus: "approved",
        },
        select: "name isVerified driverVerificationStatus",
      })
      .sort(sort)
      .limit(hasRouteRequest ? 20 : 50);
    const eligibleRides = rides.filter((ride) => ride.driver);
    if (!requestPoints) {
      return res.json({
        rides: eligibleRides,
        matching: { method: "not-applied", reason: "Enter pickup and destination to rank by route" },
      });
    }
    const result = await matchRides(eligibleRides, requestPoints, req.query.sort);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get("/:rideId/bookings", requireRole("driver"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  if (!mongoose.isValidObjectId(req.params.rideId)) return res.status(400).json({ message: "Invalid ride ID" });
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, driver: req.user._id, city });
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    const bookings = await Booking.find({ ride: ride._id })
      .populate("passenger", "name email isVerified")
      .sort({ createdAt: -1 });
    return res.json({ ride, bookings });
  } catch (error) {
    return next(error);
  }
});

router.get("/:rideId", async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  if (!mongoose.isValidObjectId(req.params.rideId)) return res.status(400).json({ message: "Invalid ride ID" });
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, city }).populate("driver", "name isVerified");
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    return res.json({ ride: publicRide(ride) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:rideId", requireRole("driver"), requireApprovedDriver, async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  if (!mongoose.isValidObjectId(req.params.rideId)) return res.status(400).json({ message: "Invalid ride ID" });
  const { fields, error } = validateRideInput(req.body || {}, city, { partial: true });
  if (error) return res.status(400).json({ message: error });
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, driver: req.user._id, city });
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    if (!["open", "full"].includes(ride.status) || ride.departureTime <= new Date()) {
      return res.status(409).json({ message: "This ride can no longer be edited" });
    }
    const routeFieldsChanged = ["pickup", "destination", "stops"].some((field) => fields[field] !== undefined
      && !sameRideField(field, fields[field], ride[field]));
    const scheduleChanged = fields.departureTime !== undefined && fields.departureTime.getTime() !== ride.departureTime.getTime();
    if (routeFieldsChanged || scheduleChanged) {
      if (await Booking.exists({ ride: ride._id, status: { $in: ACTIVE_BOOKING_STATUSES } })) {
        return res.status(409).json({ message: "Route, stops, or departure time cannot change while passengers have active bookings. Cancel the ride and repost it to change agreed trip details." });
      }
    }
    if (routeFieldsChanged) {
      const nextPickup = fields.pickup || ride.pickup;
      const nextDestination = fields.destination || ride.destination;
      const nextStops = fields.stops || ride.stops || [];
      try {
        await validateRideWaypoints([nextPickup, ...nextStops, nextDestination]);
      } catch {
        return res.status(503).json({ message: "Road route validation is unavailable. The route was not changed." });
      }
    }
    let updated;
    if (fields.seats !== undefined && fields.seats !== ride.seats) {
      const difference = fields.seats - ride.seats;
      updated = await Ride.findOneAndUpdate(
        { _id: ride._id, driver: req.user._id, status: { $in: ["open", "full"] }, departureTime: { $gt: new Date() }, seatsAvailable: { $gte: Math.max(0, -difference) } },
        [{ $set: {
          ...fields,
          seats: fields.seats,
          seatsAvailable: { $add: ["$seatsAvailable", difference] },
          status: { $cond: [{ $gt: [{ $add: ["$seatsAvailable", difference] }, 0] }, "open", "full"] },
        } }],
        { new: true, updatePipeline: true }
      );
    } else {
      updated = await Ride.findOneAndUpdate(
        { _id: ride._id, driver: req.user._id, status: { $in: ["open", "full"] }, departureTime: { $gt: new Date() } },
        { $set: fields },
        { new: true, runValidators: true }
      );
    }
    if (!updated) return res.status(409).json({ message: "Seat changes conflict with existing bookings" });
    const changedFields = ["pickup", "destination", "stops", "departureTime", "seats", "fare", "instructions"]
      .filter((field) => fields[field] !== undefined && !sameRideField(field, fields[field], ride[field]));
    if (changedFields.length) {
      const bookings = await Booking.find({ ride: ride._id, status: { $in: ACTIVE_BOOKING_STATUSES } }).select("_id passenger");
      const recipients = new Set([String(ride.driver), ...bookings.map((booking) => String(booking.passenger))]);
      await createNotifications([...recipients].map((recipient) => ({
        recipient,
        eventType: "ride_updated",
        ride: ride._id,
        title: "Ride details updated",
        message: `The driver updated the ride: ${changedFields.join(", ")}.`,
        dedupeKey: `ride_updated:${updated._id}:${updated.updatedAt.getTime()}:${recipient}`,
      })));
    }
    return res.json({ ride: updated });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:rideId/status", requireRole("driver"), async (req, res, next) => {
  const city = assignedCity(req, res);
  if (!city) return;
  if (!mongoose.isValidObjectId(req.params.rideId)) return res.status(400).json({ message: "Invalid ride ID" });
  const { status } = req.body || {};
  if (!["cancelled", "completed"].includes(status)) return res.status(400).json({ message: "Status must be cancelled or completed" });
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, driver: req.user._id, city });
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    if (!["open", "full"].includes(ride.status)) return res.status(409).json({ message: "This ride is already closed" });
    if (status === "cancelled" && ride.departureTime <= new Date()) return res.status(409).json({ message: "A departed ride cannot be cancelled" });
    if (status === "completed" && ride.departureTime > new Date()) return res.status(409).json({ message: "A ride cannot be completed before departure" });
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: ride._id, driver: req.user._id, city, status: { $in: ["open", "full"] } },
      { $set: { status } },
      { new: true }
    );
    if (!updatedRide) return res.status(409).json({ message: "This ride was updated by another request" });
    const activeBookings = await Booking.find({ ride: ride._id, status: { $in: ACTIVE_BOOKING_STATUSES } }).select("_id passenger");
    await Booking.updateMany(
      { ride: ride._id, status: { $in: ACTIVE_BOOKING_STATUSES } },
      { $set: { status: status === "completed" ? "completed" : "cancelled" } }
    );
    const eventType = status === "completed" ? "ride_completed" : "ride_cancelled";
    const title = status === "completed" ? "Ride completed" : "Ride cancelled";
    const message = status === "completed"
      ? "Your ride is complete."
      : "Your ride was cancelled by the driver.";
    const recipients = new Map();
    recipients.set(String(ride.driver), ride.driver);
    activeBookings.forEach((booking) => recipients.set(String(booking.passenger), booking.passenger));
    await createNotifications([...recipients].map(([recipientId, recipient]) => ({
      recipient,
      eventType,
      ride: ride._id,
      title,
      message,
      dedupeKey: `${eventType}:${ride._id}:${updatedRide.updatedAt.getTime()}:${recipientId}`,
    })));
    return res.json({ ride: updatedRide });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
