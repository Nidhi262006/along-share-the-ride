import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, CarFront, Check, Clock3, IndianRupee, Plus, Star, Users, X } from "lucide-react";
import { acceptRideRequest, declineRideRequest, decideBookingRoute, getRideBookings, listDriverRides, listOpenRideRequests, updateRideStatus } from "../../services/rideService.js";
import { formatPlace } from "../../utils/display.js";

async function loadDriverBookings() {
  const rides = await listDriverRides();
  const grouped = await Promise.all(rides.map(async (ride) => {
    const result = await getRideBookings(ride._id);
    return result.bookings.map((booking) => ({ ...booking, ride }));
  }));
  return grouped.flat();
}

export function DriverRides() {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try { setRides(await listDriverRides()); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  async function changeStatus(ride, status) {
    setBusyId(ride._id);
    setError("");
    try {
      await updateRideStatus(ride._id, status);
      await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(null); }
  }

  return <Page title="My rides" subtitle="Manage your posted routes and ride history">
    <div className="flex justify-end mb-5"><button onClick={() => navigate("/driver/post-ride")} className="bg-rose text-plumText rounded-xl px-4 py-2.5 text-sm flex items-center gap-2"><Plus size={16}/> Post a ride</button></div>
    {error && <p role="alert" className="mb-4 text-sm text-coral">{error}</p>}
    {loading ? <p className="text-center py-10 text-sm text-inkMuted">Loading your rides...</p> : rides.length === 0 ? <Empty text="You have not posted any rides yet" /> : <div className="space-y-3">{rides.map((ride) => {
      const departed = new Date(ride.departureTime) <= new Date();
      const active = ["open", "full"].includes(ride.status);
      const route = `${formatPlace(ride.pickup.address)} → ${formatPlace(ride.destination.address)}`;
      return <div className="bg-white border border-cardBorder rounded-2xl p-5" key={ride._id}>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-cream flex items-center justify-center"><CarFront size={19} className="text-rose"/></div>
          <div className="flex-1 min-w-0"><p title={`${ride.pickup.address} → ${ride.destination.address}`} className="line-clamp-2 font-medium text-sm">{route}</p><p className="text-xs text-inkMuted mt-1">{new Date(ride.departureTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {ride.seats - ride.seatsAvailable}/{ride.seats} seats booked · {ride.seatsAvailable} remaining</p></div>
          <p className="text-sm font-semibold">₹{ride.fare}/seat</p>
          <span className={`text-xs px-3 py-1.5 rounded-full ${active ? "bg-sage/15 text-sage" : "bg-cream text-inkMuted"}`}>{ride.status}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {active && !departed && <button onClick={() => navigate(`/driver/post-ride/${ride._id}`)} className="text-xs border border-cardBorder rounded-lg px-3 py-2">Edit ride</button>}
          <button onClick={() => navigate("/driver/bookings")} className="text-xs border border-cardBorder rounded-lg px-3 py-2">Manage bookings</button>
          {active && departed && <button disabled={busyId === ride._id} onClick={() => changeStatus(ride, "completed")} className="text-xs bg-sage/15 text-sage rounded-lg px-3 py-2 disabled:opacity-60">{busyId === ride._id ? "Updating..." : "Mark completed"}</button>}
          {active && !departed && <button disabled={busyId === ride._id} onClick={() => changeStatus(ride, "cancelled")} className="text-xs text-coral border border-cardBorder rounded-lg px-3 py-2 disabled:opacity-60">{busyId === ride._id ? "Cancelling..." : "Cancel ride"}</button>}
        </div>
      </div>;
    })}</div>}
  </Page>;
}

export function DriverBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decisionId, setDecisionId] = useState(null);
  useEffect(() => {
    let active = true;
    loadDriverBookings().then((result) => { if (active) setBookings(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const activeBookings = bookings.filter((booking) => ["pending", "confirmed"].includes(booking.status));
  async function decide(booking, decision) {
    setDecisionId(booking._id);
    setError("");
    try {
      await decideBookingRoute(booking.ride._id, booking._id, decision);
      setBookings((current) => current.map((item) => item._id === booking._id ? { ...item, status: decision === "accept" ? "confirmed" : "rejected" } : item));
    } catch (requestError) { setError(requestError.message); }
    finally { setDecisionId(null); }
  }
  return <Page title="Bookings" subtitle="Passengers with bookings on your rides">
    {error && <p role="alert" className="mb-4 text-sm text-coral">{error}</p>}
    {loading ? <p className="py-10 text-center text-sm text-inkMuted">Loading bookings...</p> : activeBookings.length === 0 ? <Empty text="No passenger bookings" /> : <div className="space-y-3">{activeBookings.map((booking) => <div className="bg-white border border-cardBorder rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4" key={booking._id}>
      <div className="w-11 h-11 rounded-full bg-plum text-plumText flex items-center justify-center text-xs">{booking.passenger?.name?.split(" ").map((part) => part[0]).join("")}</div>
      <div className="flex-1 min-w-0"><p className="text-sm font-medium">{booking.passenger?.name || "Passenger"}</p><p className="text-xs text-inkMuted mt-1">{booking.passenger?.email}</p><p title={`${booking.pickup?.address || booking.ride.pickup.address} → ${booking.dropoff?.address || booking.ride.destination.address}`} className="mt-1 line-clamp-2 text-xs text-inkMuted">{formatPlace(booking.pickup?.address || booking.ride.pickup.address)} → {formatPlace(booking.dropoff?.address || booking.ride.destination.address)}</p><p className="text-xs text-inkMuted mt-1">{booking.seats} seat{booking.seats === 1 ? "" : "s"} · ₹{booking.farePerSeat ?? booking.ride.fare}/seat · ₹{booking.totalFare ?? (booking.farePerSeat ?? booking.ride.fare) * booking.seats} total · {new Date(booking.ride.departureTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {booking.ride.seatsAvailable} seats remaining</p><p className="text-xs text-inkMuted mt-1">Offline payment · {booking.paymentStatus || "pending"}</p></div>
      {booking.status === "pending" ? <div className="flex gap-2"><button disabled={decisionId === booking._id} onClick={() => decide(booking, "accept")} className="rounded-lg bg-sage px-3 py-2 text-xs text-white disabled:opacity-60">Accept route</button><button disabled={decisionId === booking._id} onClick={() => decide(booking, "reject")} className="rounded-lg border border-coral px-3 py-2 text-xs text-coral disabled:opacity-60">Decline</button></div> : <span className="text-xs px-3 py-1.5 rounded-full bg-sage/15 text-sage">Confirmed</span>}
    </div>)}</div>}
  </Page>;
}

function localDate(value) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function RideRequests() {
  const navigate = useNavigate();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [rides, setRides] = useState([]);
  const [selectedRides, setSelectedRides] = useState({});
  const [dateFilter, setDateFilter] = useState("");
  const [textFilter, setTextFilter] = useState("");
  const [sort, setSort] = useState("earliest");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(location.state?.error || "");
  const [notice, setNotice] = useState(location.state?.notice || "");

  async function refresh() {
    setLoading(true);
    setError(location.state?.error || "");
    try {
      const [openRequests, driverRides] = await Promise.all([listOpenRideRequests(), listDriverRides()]);
      setRequests(openRequests);
      setRides(driverRides);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const filteredRequests = requests.filter((request) => {
    const matchesDate = !dateFilter || localDate(request.departureTime) === dateFilter;
    const query = textFilter.trim().toLocaleLowerCase();
    const matchesText = !query || `${request.pickup.address} ${request.destination.address}`.toLocaleLowerCase().includes(query);
    return matchesDate && matchesText;
  }).sort((first, second) => (new Date(first.departureTime) - new Date(second.departureTime)) * (sort === "earliest" ? 1 : -1));

  function ridesForRequest(request) {
    return rides.filter((ride) => ride.status === "open"
      && ride.seatsAvailable >= request.passengers
      && new Date(ride.departureTime) > new Date()
      && Math.abs(new Date(ride.departureTime) - new Date(request.departureTime)) <= 60 * 60 * 1000
      && (request.maxFarePerSeat === null || ride.fare <= request.maxFarePerSeat));
  }

  async function accept(request) {
    const rideId = selectedRides[request._id];
    if (!rideId) {
      setError("Choose one of your upcoming rides first, or create a ride from this request.");
      return;
    }
    setBusyId(request._id);
    setError("");
    setNotice("");
    try {
      const result = await acceptRideRequest(request._id, rideId);
      setRequests((current) => current.filter((item) => item._id !== request._id));
      setRides((current) => current.map((ride) => ride._id === rideId ? { ...ride, ...result.booking.ride } : ride));
      setNotice("Request accepted. The passenger has been notified and a booking was created.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function decline(request) {
    setBusyId(request._id);
    setError("");
    try {
      await declineRideRequest(request._id);
      setRequests((current) => current.filter((item) => item._id !== request._id));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  return <Page title="Passenger requests" subtitle="Open ride requests in your service area">
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <label className="block text-xs text-inkMuted">Filter by date<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-cardBorder bg-white px-3 py-2 text-sm text-ink" /></label>
      <label className="block text-xs text-inkMuted">Search city or area<input value={textFilter} onChange={(event) => setTextFilter(event.target.value)} placeholder="Search from or to" className="mt-1 w-full rounded-lg border border-cardBorder bg-white px-3 py-2 text-sm text-ink" /></label>
      <label className="block text-xs text-inkMuted">Sort by<select value={sort} onChange={(event) => setSort(event.target.value)} className="mt-1 w-full rounded-lg border border-cardBorder bg-white px-3 py-2 text-sm text-ink"><option value="earliest">Earliest first</option><option value="latest">Latest first</option></select></label>
    </div>
    {error && <p role="alert" className="mb-4 text-sm text-coral">{error}</p>}
    {notice && <p role="status" className="mb-4 text-sm text-sage">{notice}</p>}
    {loading ? <p className="py-10 text-center text-sm text-inkMuted">Loading passenger requests...</p>
      : filteredRequests.length === 0 ? <Empty text={requests.length ? "No requests match these filters" : "No open passenger requests"} />
        : <div className="space-y-3">{filteredRequests.map((request) => {
          const eligibleRides = ridesForRequest(request);
          const route = `${formatPlace(request.pickup.address)} → ${formatPlace(request.destination.address)}`;
          return <article key={request._id} className="rounded-2xl border border-cardBorder bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <p title={`${request.pickup.address} → ${request.destination.address}`} className="line-clamp-2 text-sm font-semibold text-ink">{route}</p>
                <p className="mt-1 text-xs text-inkMuted">{new Date(request.departureTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {request.passengers} passenger{request.passengers === 1 ? "" : "s"}{request.maxFarePerSeat !== null ? ` · Max ₹${request.maxFarePerSeat}/seat` : ""}</p>
                {request.note && <p className="mt-2 whitespace-pre-wrap text-sm text-inkMuted">{request.note}</p>}
                <p className="mt-2 text-xs text-inkMuted">Requested by {request.passenger?.name || "Passenger"}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button type="button" disabled={busyId === request._id} onClick={() => decline(request)} className="rounded-lg border border-cardBorder px-3 py-2 text-xs text-inkMuted disabled:opacity-60">{busyId === request._id ? "Saving..." : "Decline"}</button>
                <button type="button" disabled={busyId === request._id} onClick={() => accept(request)} className="rounded-lg bg-plum px-3 py-2 text-xs text-white disabled:opacity-60">{busyId === request._id ? "Accepting..." : "Accept"}</button>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-cardBorder pt-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 text-xs text-inkMuted">Match with one of your upcoming rides
                <select value={selectedRides[request._id] || ""} onChange={(event) => setSelectedRides((current) => ({ ...current, [request._id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-cardBorder bg-white px-3 py-2 text-sm text-ink">
                  <option value="">Select a ride</option>
                  {eligibleRides.map((ride) => <option key={ride._id} value={ride._id} title={`${ride.pickup.address} → ${ride.destination.address}`}>{formatPlace(ride.pickup.address)} → {formatPlace(ride.destination.address)} · {new Date(ride.departureTime).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} · {ride.seatsAvailable} seats · ₹{ride.fare}/seat</option>)}
                </select>
              </label>
              <button type="button" onClick={() => navigate("/driver/post-ride", { state: { rideRequestId: request._id, rideRequest: {
                pickupAddress: request.pickup.address,
                destinationAddress: request.destination.address,
                departureTime: request.departureTime,
                seats: request.passengers,
                fare: request.maxFarePerSeat ?? "",
                instructions: request.note,
              } } })} className="rounded-lg border border-cardBorder px-3 py-2 text-xs text-ink">Create a new ride</button>
            </div>
            {!eligibleRides.length && <p className="mt-2 text-xs text-inkMuted">No matching upcoming rides with enough seats. You can create one from this request.</p>}
          </article>;
        })}</div>}
  </Page>;
}

export function Passengers() {
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    loadDriverBookings().then((bookings) => {
      const byPassenger = new Map();
      for (const booking of bookings.filter((item) => ["confirmed", "completed"].includes(item.status))) {
        const person = booking.passenger;
        if (!person) continue;
        const current = byPassenger.get(person._id) || { ...person, rides: 0 };
        current.rides += 1;
        byPassenger.set(person._id, current);
      }
      if (active) setPassengers([...byPassenger.values()]);
    }).catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <Page title="Passengers" subtitle="People booked on your rides">
    {error && <p role="alert" className="mb-4 text-sm text-coral">{error}</p>}
    {loading ? <p className="py-10 text-center text-sm text-inkMuted">Loading passengers...</p> : passengers.length === 0 ? <Empty text="No passengers on your rides yet" /> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{passengers.map((person) => <div className="bg-white border border-cardBorder rounded-xl p-5" key={person._id}><div className="w-12 h-12 rounded-full bg-cream flex items-center justify-center text-sm font-medium text-rose">{person.name.split(" ").map((part) => part[0]).join("")}</div><p className="font-medium text-sm mt-4">{person.name}</p><p className="text-xs text-inkMuted mt-1 break-all">{person.email}</p><p className="text-xs text-inkMuted mt-1">{person.rides} booking{person.rides === 1 ? "" : "s"}</p></div>)}</div>}
  </Page>;
}

export function Earnings() { return <Page title="Earnings" subtitle="Track what you have earned from shared rides"><div className="grid sm:grid-cols-3 gap-4 mb-5">{[["This month","₹4,820"],["This week","₹1,260"],["Total earned","₹18,450"]].map(x=><div className="bg-white border border-cardBorder rounded-2xl p-5" key={x[0]}><p className="text-xs text-inkMuted">{x[0]}</p><p className="font-heading text-2xl font-semibold mt-3">{x[1]}</p></div>)}</div><div className="bg-white border border-cardBorder rounded-2xl p-6"><h2 className="font-heading text-lg font-semibold">Recent earnings</h2><div className="mt-4 space-y-3">{["Nagpur → Wardha","Wardha → Nagpur","Nagpur → Hinganghat","Nagpur → Wardha"].map((r,i)=><div className="flex items-center gap-3 border-b border-cardBorder pb-3" key={r+i}><div className="w-9 h-9 rounded-lg bg-sage/15 flex items-center justify-center"><IndianRupee size={15} className="text-sage"/></div><div className="flex-1"><p className="text-sm">{r}</p><p className="text-xs text-inkMuted">{12-i} Aug · {3+i} passengers</p></div><p className="text-sm font-medium text-sage">+₹{360-i*80}</p></div>)}</div></div></Page>; }

export function DriverProfile() { return <Page title="Driver profile" subtitle="Build trust with passengers"><div className="bg-white border border-cardBorder rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5"><div className="w-20 h-20 rounded-full bg-plum text-plumText flex items-center justify-center text-xl shrink-0">NP</div><div className="flex-1 min-w-0"><h2 className="font-heading text-xl font-semibold">Nidhi Palandurkar</h2><p className="text-sm text-inkMuted mt-1">Verified driver · Nagpur</p><div className="flex items-center gap-1 text-sm mt-2"><Star size={14} className="fill-gold text-gold"/> 4.9 rating · 28 rides</div></div><Link to="/driver/verification" className="shrink-0 text-xs font-medium text-rose border border-cardBorder rounded-lg px-4 py-2.5 text-center">Manage verification</Link></div><div className="grid sm:grid-cols-3 gap-4 mt-5">{[["Vehicle","Toyota Etios"],["Registration","MH 12 AB 1234"],["Experience","2 years"]].map(x=><div className="bg-white border border-cardBorder rounded-2xl p-5" key={x[0]}><p className="text-xs text-inkMuted">{x[0]}</p><p className="text-sm font-medium mt-2">{x[1]}</p></div>)}</div></Page>; }

export function Page({title,subtitle,children}) { return <div className="min-h-full bg-[#f7f3ed] p-4 sm:p-6 lg:p-8"><div className="max-w-5xl mx-auto"><header className="mb-7"><h1 className="font-heading text-2xl sm:text-3xl font-semibold text-ink">{title}</h1><p className="text-sm text-inkMuted mt-1">{subtitle}</p></header>{children}</div></div>; }
function Empty({text}) { return <div className="text-center py-16 bg-white border border-cardBorder rounded-2xl text-sm text-inkMuted">{text}</div>; }