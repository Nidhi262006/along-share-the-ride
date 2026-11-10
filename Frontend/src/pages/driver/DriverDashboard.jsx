import { useEffect, useState } from "react";
import { ArrowRight, Bell, CarFront, ClipboardList, Clock3, IndianRupee, Navigation, Plus, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import RealMap from "../../components/RealMap.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { decideBookingRoute, getRideBookings, listDriverRides, listOpenRideRequests } from "../../services/rideService.js";
import { formatPlace, getGreeting } from "../../utils/display.js";

async function loadDriverDashboard() {
  const [rides, requests] = await Promise.all([listDriverRides(), listOpenRideRequests()]);
  const groups = await Promise.all(rides.map((ride) => getRideBookings(ride._id)));
  const bookings = groups.flatMap(({ ride, bookings: rideBookings }) =>
    rideBookings.map((booking) => ({ ...booking, ride }))
  );
  return { rides, bookings, requests };
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rides, setRides] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyBookingId, setBusyBookingId] = useState(null);

  useEffect(() => {
    let active = true;
    loadDriverDashboard().then((result) => {
      if (!active) return;
      setRides(result.rides);
      setBookings(result.bookings);
      setRequests(result.requests);
      setError("");
    })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function decideBooking(booking, decision) {
    setBusyBookingId(booking._id);
    setError("");
    try {
      await decideBookingRoute(booking.ride._id, booking._id, decision);
      const latest = await loadDriverDashboard();
      setRides(latest.rides);
      setBookings(latest.bookings);
      setRequests(latest.requests);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyBookingId(null);
    }
  }

  const upcomingRide = rides.find((ride) => ["open", "full"].includes(ride.status) && new Date(ride.departureTime) > new Date());
  const currentRide = upcomingRide || rides[0];
  const activeRides = rides.filter((ride) => ["open", "full"].includes(ride.status));
  const pendingBookings = bookings.filter((booking) => booking.status === "pending");
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed");
  const confirmedBookingValue = confirmedBookings.reduce((total, booking) =>
    total + (booking.totalFare ?? booking.farePerSeat * booking.seats), 0);
  const recentBookings = [...bookings].sort((first, second) =>
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  ).slice(0, 4);
  return (
    <div className="min-h-full bg-[#fbf9fd] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-7">
          <div><p className="text-xs text-inkMuted">Driver dashboard</p><h1 className="font-heading text-2xl sm:text-3xl font-semibold text-ink mt-1">{getGreeting()}, {user?.name?.split(" ")[0] || "Driver"}!</h1><p className="text-sm text-inkMuted mt-1">Manage your rides and passenger requests.</p></div>
          <div className="flex items-center gap-3"><Link to="/driver/notifications" aria-label="Notifications" className="w-10 h-10 rounded-xl bg-white border border-cardBorder flex items-center justify-center"><Bell size={17} /></Link><Link to="/driver/profile" className="w-10 h-10 rounded-xl bg-plum text-plumText flex items-center justify-center text-xs font-medium">{user?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2)}</Link></div>
        </header>

        <section className="grid lg:grid-cols-[1.45fr_0.75fr] gap-5">
          <div className="rounded-2xl overflow-hidden bg-plum text-plumText min-h-[285px] relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,.18),transparent_30%),linear-gradient(135deg,#241b2e,#5f3a56)]" />
            <div className="relative p-6 sm:p-7 h-full flex flex-col justify-between">
              <div><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage/20 text-sageBright text-[11px]"><span className="w-1.5 h-1.5 rounded-full bg-sageBright" /> {loading ? "Loading rides" : currentRide ? (upcomingRide ? "Upcoming ride" : currentRide.status) : "No posted rides"}</span><h2 title={currentRide ? `${currentRide.pickup.address} → ${currentRide.destination.address}` : undefined} className="mt-5 line-clamp-2 font-heading text-2xl font-semibold">{currentRide ? `${formatPlace(currentRide.pickup.address)} → ${formatPlace(currentRide.destination.address)}` : "No upcoming rides"}</h2><p className="text-plumMuted text-sm mt-1">{currentRide ? `${new Date(currentRide.departureTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · ${currentRide.seats - currentRide.seatsAvailable} seats booked` : "Post a ride to share your route with passengers."}</p></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8"><div><p className="text-xs text-plumMuted">Seats booked</p><p className="text-lg font-semibold mt-1">{currentRide ? `${currentRide.seats - currentRide.seatsAvailable} / ${currentRide.seats}` : "0 / 0"}</p></div><div><p className="text-xs text-plumMuted">Fare / seat</p><p className="text-lg font-semibold mt-1">{currentRide ? `₹${currentRide.fare}` : "--"}</p></div><div><p className="text-xs text-plumMuted">Seats available</p><p className="text-lg font-semibold mt-1">{currentRide?.seatsAvailable ?? 0}</p></div><div><p className="text-xs text-plumMuted">Status</p><p className="text-lg font-semibold mt-1 text-sageBright">{currentRide?.status || "Ready"}</p></div></div>
              <div className="flex flex-wrap gap-3 mt-6"><button onClick={() => navigate("/driver/rides")} className="px-4 py-2.5 rounded-lg bg-white text-plum text-xs font-medium">Manage rides</button><button onClick={() => navigate("/driver/bookings")} className="px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 text-xs font-medium">View bookings</button></div>
            </div>
          </div>

          <div className="bg-white border border-cardBorder rounded-2xl p-6 flex flex-col justify-between"><div><p className="text-xs text-inkMuted">Post a new ride</p><h2 className="font-heading text-xl font-semibold text-ink mt-2">Have empty seats?</h2><p className="text-sm text-inkMuted mt-2 leading-6">Share your route and let passengers find you.</p></div><button onClick={() => navigate("/driver/post-ride")} className="w-full mt-6 bg-rose text-plumText rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2"><Plus size={17} /> Post a ride</button></div>
        </section>

        {error && <p role="alert" className="mt-5 rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p>}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Pending bookings", loading ? "…" : pendingBookings.length, Users],
            ["Confirmed bookings", loading ? "…" : confirmedBookings.length, IndianRupee],
            ["Published rides", loading ? "…" : rides.length, CarFront],
            ["Available seats", loading ? "…" : activeRides.reduce((sum, ride) => sum + ride.seatsAvailable, 0), Users],
            ["Open passenger requests", loading ? "…" : requests.length, ClipboardList],
          ].map(([label, value, Icon]) => (
            <Link to={label === "Open passenger requests" ? "/driver/requests" : "/driver/bookings"} key={label} className="rounded-2xl border border-[#e7e0ed] bg-white p-5">
              <div className="flex items-center justify-between"><p className="text-xs text-inkMuted">{label}</p><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f0f8]"><Icon size={17} className="text-rose" /></div></div>
              <p className="mt-4 font-heading text-xl font-semibold">{value}</p>
            </Link>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-[#e7e0ed] bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-heading text-lg font-semibold">Passenger bookings</h2><p className="mt-1 text-xs text-inkMuted">Bookings on your published rides</p></div><Link to="/driver/bookings" className="flex items-center gap-1 text-xs text-rose">View bookings <ArrowRight size={14} /></Link></div>
          {recentBookings.length === 0 ? <p className="py-5 text-sm text-inkMuted">{loading ? "Loading bookings..." : "Your ride bookings will appear here."}</p> : (
            <div className="space-y-2">
              {recentBookings.map((booking) => {
                const passenger = booking.passenger;
                const passengerName = typeof passenger === "object" ? passenger?.name : "Passenger";
                const initials = passengerName?.split(/\s+/).map((part) => part[0]).join("").slice(0, 2) || "RM";
                return (
                  <article key={booking._id} className="flex flex-col gap-3 rounded-xl border border-[#eee9f2] p-4 sm:flex-row sm:items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4f0f8] text-xs font-medium text-[#514665]">{initials}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{passengerName || "Passenger"}</p>
                      <p title={`${booking.ride?.pickup?.address || ""} → ${booking.ride?.destination?.address || ""}`} className="mt-1 line-clamp-2 text-xs text-inkMuted">{formatPlace(booking.ride?.pickup?.address)} → {formatPlace(booking.ride?.destination?.address)}</p>
                      <p className="mt-1 text-xs capitalize text-inkMuted">{booking.seats} seat{booking.seats === 1 ? "" : "s"} · {booking.status} · ₹{booking.totalFare ?? booking.farePerSeat * booking.seats}</p>
                    </div>
                    {booking.status === "pending" && (
                      <div className="flex gap-2 sm:ml-auto">
                        <button type="button" disabled={busyBookingId === booking._id} onClick={() => decideBooking(booking, "reject")} className="rounded-lg border border-[#e7e0ed] px-3 py-2 text-xs text-[#6f687c] disabled:opacity-60">Decline</button>
                        <button type="button" disabled={busyBookingId === booking._id} onClick={() => decideBooking(booking, "accept")} className="rounded-lg bg-[#2a2438] px-3 py-2 text-xs text-white disabled:opacity-60">{busyBookingId === booking._id ? "Saving..." : "Accept route"}</button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {confirmedBookingValue > 0 && <p className="mt-4 border-t border-[#eee9f2] pt-3 text-xs text-inkMuted">Confirmed booking value: ₹{confirmedBookingValue.toLocaleString("en-IN")} (offline payment)</p>}
        </section>

         <section className="grid lg:grid-cols-[1.4fr_1fr] gap-5 mt-5">
          <div className="bg-white border border-cardBorder rounded-2xl p-6"><div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center"><Navigation size={18} className="text-rose" /></div><div><h3 className="font-heading text-sm font-semibold">Your route</h3><p className="text-xs text-inkMuted mt-1">Service area: {user?.serviceCity === "bengaluru" ? "Bengaluru" : "Nagpur"}</p></div></div><div className="h-[320px]"><RealMap city={user?.serviceCity} /></div></div>
          <div className="bg-plum text-plumText rounded-2xl p-6"><div className="flex items-center gap-3"><Clock3 size={18} className="text-sageBright" /><h3 className="font-heading text-sm font-semibold">Driver tips</h3></div><p className="text-sm text-plumMuted mt-4 leading-6">Keep your pickup point clear, confirm passenger requests before departure and update your ride status on time.</p><button className="text-xs text-sageBright mt-4 flex items-center gap-1">Learn more <ArrowRight size={13} /></button></div>
        </section>
      </div>
    </div>
  );
}
