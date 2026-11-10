import { request } from "./authService.js";

export async function createRide(ride) {
  return (await request("/rides", { method: "POST", body: JSON.stringify(ride) })).ride;
}

export async function searchRideMatches(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return request(`/rides${query ? `?${query}` : ""}`);
}

export async function searchRides(filters = {}) {
  return (await searchRideMatches(filters)).rides;
}

export async function listDriverRides() {
  return (await request("/rides/mine")).rides;
}

export async function getRideBookings(rideId) {
  return request(`/rides/${encodeURIComponent(rideId)}/bookings`);
}

export async function decideBookingRoute(rideId, bookingId, decision) {
  return (await request(`/rides/${encodeURIComponent(rideId)}/bookings/${encodeURIComponent(bookingId)}/decision`, {
    method: "PATCH",
    body: JSON.stringify({ decision }),
  })).booking;
}

export async function updateRide(rideId, fields) {
  return (await request(`/rides/${encodeURIComponent(rideId)}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  })).ride;
}

export async function updateRideStatus(rideId, status) {
  return (await request(`/rides/${encodeURIComponent(rideId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })).ride;
}

export async function createBooking(rideId, seats, points = {}, expectedRide = {}, clientBookingId) {
  return (await request(`/rides/${encodeURIComponent(rideId)}/bookings`, {
    method: "POST",
    body: JSON.stringify({ seats, ...points, ...expectedRide, clientBookingId }),
  })).booking;
}

export async function listMyBookings() {
  return (await request("/rides/bookings")).bookings;
}

export async function cancelBooking(bookingId) {
  return (await request(`/rides/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: "PATCH",
  })).booking;
}

export async function createRideRequest(rideRequest) {
  return (await request("/rides/requests", {
    method: "POST",
    body: JSON.stringify(rideRequest),
  })).request;
}

export async function listMyRideRequests() {
  return (await request("/rides/requests/mine")).requests;
}

export async function cancelRideRequest(requestId) {
  return (await request(`/rides/requests/${encodeURIComponent(requestId)}/cancel`, {
    method: "PATCH",
  })).request;
}

export async function listOpenRideRequests() {
  return (await request("/rides/requests/open")).requests;
}

export async function declineRideRequest(requestId) {
  return (await request(`/rides/requests/${encodeURIComponent(requestId)}/decline`, {
    method: "POST",
  })).request;
}

export async function acceptRideRequest(requestId, rideId) {
  return request(`/rides/requests/${encodeURIComponent(requestId)}/accept`, {
    method: "POST",
    body: JSON.stringify({ rideId }),
  });
}
