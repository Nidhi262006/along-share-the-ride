import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Bell,
  MapPin,
  Search,
  Plus,
  Users,
  Gift,
  Clock,
} from "lucide-react";

import RideCard from "../components/RideCard.jsx";
import RealMap from "../components/RealMap.jsx";
import LocationSearch from "../components/LocationSearch.jsx";

import { useAuth } from "../context/AuthContext.jsx";
import { createBooking, listMyBookings, searchRides } from "../services/rideService.js";

const tabs = ["Recommended", "Fastest", "Cheapest"];

function formatPaise(paise) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100);
}

const quickActions = [
  { label: "Find ride", icon: Search, to: "/find-ride" },
  { label: "My bookings", icon: Plus, to: "/my-rides" },
  { label: "Invite friends", icon: Users, to: "/profile" },
  { label: "Earn rewards", icon: Gift, to: "/wallet" },
];

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Recommended");
  const [selectedId, setSelectedId] = useState(null);
  const [rides, setRides] = useState([]);
  const [rideHistory, setRideHistory] = useState([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingRequestId, setBookingRequestId] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [bookingNotice, setBookingNotice] = useState("");
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);

  useEffect(() => {
    let active = true;
    setLoadingRides(true);
    Promise.all([
      searchRides({ sort: activeTab === "Cheapest" ? "fare" : "departure" }),
      listMyBookings(),
    ]).then(([availableRides, bookings]) => {
      if (!active) return;
      setRides(availableRides.slice(0, 3));
      setRideHistory(bookings.slice(0, 3));
      setLoadError("");
    }).catch((requestError) => {
      if (active) setLoadError(requestError.message);
    }).finally(() => {
      if (active) setLoadingRides(false);
    });
    return () => { active = false; };
  }, [activeTab]);

  const userInitials = user?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2) || "RM";
  const cityLabel = user?.serviceCity === "bengaluru" ? "Bengaluru" : "Nagpur";
  const selectedRide = rides.find((ride) => ride._id === selectedId);
  const selectedFare = selectedRide?.fare ?? selectedRide?.price ?? 0;
  const selectedTotalFarePaise = Math.round(Number(selectedFare) * 100) * selectedSeats;
  const selectedDriver = typeof selectedRide?.driver === "string"
    ? selectedRide.driver
    : selectedRide?.driver?.name || "RouteMate driver";
  const selectedRideDriverId = typeof selectedRide?.driver === "object"
    ? selectedRide.driver?._id || selectedRide.driver?.id
    : selectedRide?.driver;
  const selectedRideIsOwn = Boolean(selectedRideDriverId && user?.id && String(selectedRideDriverId) === String(user.id));
  const alreadyBooked = selectedRide && rideHistory.some((booking) =>
    booking.ride?._id === selectedRide._id && ["pending", "confirmed"].includes(booking.status)
  );

  async function confirmBooking() {
    if (!selectedRide || selectedRideIsOwn || selectedRide.seatsAvailable < 1) return;
    setBookingLoading(true);
    setBookingError("");
    setBookingNotice("");
    try {
      const requestId = bookingRequestId || crypto.randomUUID();
      setBookingRequestId(requestId);
      const booking = await createBooking(selectedRide._id, selectedSeats, {}, {
        expectedUpdatedAt: selectedRide.updatedAt,
        expectedFarePaise: Math.round(selectedFare * 100),
        expectedSeatsAvailable: selectedRide.seatsAvailable,
      }, requestId);
      setRideHistory((current) => [booking, ...current.filter((item) => item._id !== booking._id)].slice(0, 3));
      setRides((current) => current.map((ride) => ride._id === selectedRide._id
        ? {
            ...ride,
            ...(booking.ride || {}),
            seatsAvailable: booking.ride?.seatsAvailable ?? Math.max(0, ride.seatsAvailable - selectedSeats),
          }
        : ride
      ));
      setBookingNotice(`Booking confirmed for ${selectedSeats} seat${selectedSeats === 1 ? "" : "s"}. Total fare: ₹${booking.totalFare}. Pay offline with the driver; payment is still pending.`);
      setBookingRequestId(null);
    } catch (requestError) {
      setBookingError(requestError.message);
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl pt-4 md:pt-0">

      {/* =====================================================
          HERO / SEARCH SECTION
      ===================================================== */}

      <div className="relative overflow-hidden rounded-b-2xl md:rounded-2xl md:mt-6 md:mx-6 min-h-[200px]">

        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/home-bg.png')",
          }}
        />

        {/* Dark purple overlay */}
        <div className="absolute inset-0 bg-[#171b35]/60" />

        {/* Hero content */}
        <div className="relative z-10 p-5 sm:p-6 md:p-7 text-white">

          {/* ================= TOP HEADER ================= */}

          <div className="flex items-start justify-between mb-3">

            {/* Greeting */}
            <div>
              <h1 className="font-heading text-xl sm:text-2xl font-semibold leading-tight">
                Good morning, {user?.name?.split(" ")[0] || "there"} 👋
              </h1>

              <p className="text-white/75 text-xs sm:text-sm mt-1">
                Where are you headed today?
              </p>
            </div>

            {/* Notification + Avatar */}
            <div className="flex items-center gap-2 sm:gap-3">

              <button
                type="button"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/20 transition"
              >
                <Bell size={15} />
              </button>

              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#6d9b73] flex items-center justify-center text-xs font-medium text-white border border-white/20">
                {userInitials}
              </div>

            </div>

          </div>

          {/* ================= SEARCH BAR ================= */}

          <div className="mb-3 relative top-3">

            <div className="h-10 sm:h-11 bg-white rounded-xl flex items-center px-3 gap-2 shadow-md">

              <Search
                size={16}
                className="text-gray-500 shrink-0"
              />

              <input
                type="text"
                placeholder="Search for pickup and destination..."
                className="w-full bg-transparent outline-none text-xs sm:text-sm text-gray-800 placeholder:text-gray-400"
              />

            </div>

          </div>

          {/* ================= FROM / TO / DATE ================= */}

<div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 md:relative md:top-4">

  {/* FROM */}
  <div className="bg-[#263146]/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">

    <div className="flex items-center gap-1 mb-1">
      <MapPin
        size={15}
        className="text-white/70"
      />

      <p className="text-[10px] text-white/60">
        From
      </p>
    </div>

    <LocationSearch
      city={cityLabel}
      onLocationSelect={(location) =>
        setPickupLocation(location)
      }
    />

    {pickupLocation && (
      <p className="text-[10px] text-[#8fbd95] mt-2">
        Selected: {pickupLocation.name}
      </p>
    )}

  </div>


  {/* TO */}
  <div className="bg-[#263146]/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">

    <div className="flex items-center gap-2 mb-1">
      <MapPin
        size={15}
        className="text-white/70"
      />

      <p className="text-[10px] text-white/60">
        To
      </p>
    </div>

    <LocationSearch
      city={cityLabel}
      onLocationSelect={(location) =>
        setDestinationLocation(location)
      }
    />

    {destinationLocation && (
      <p className="text-[10px] text-[#8fbd95] mt-2">
        Selected: {destinationLocation.name}
      </p>
    )}

  </div>


  {/* DATE */}
  <div className="bg-[#263146]/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 flex items-center justify-between">

    <div>
      <p className="text-[10px] text-white/60">
        Date
      </p>

      <p className="text-sm mt-0.5 font-medium">
        Today
      </p>
    </div>

    <Calendar
      size={16}
      className="text-white/70"
    />

  </div>

</div>

        </div>
      </div>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="p-6 md:p-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ================= MAP ================= */}

          <RealMap
            city={user?.serviceCity}
            pickupLocation={pickupLocation}
            destinationLocation={destinationLocation}
          />

          {/* ================= RECOMMENDED RIDES ================= */}

          <div>

            <div className="flex gap-2 mb-4">

              {tabs.map((tab) => (

                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab
                      ? "bg-rose text-plumText font-medium"
                      : "bg-card border border-cardBorder text-inkMuted hover:text-ink"
                  }`}
                >
                  {tab}
                </button>

              ))}

            </div>

            <div className="flex flex-col gap-3">

              {loadingRides && <p className="text-sm text-inkMuted py-6 text-center">Loading rides...</p>}
              {loadError && <p role="alert" className="text-sm text-coral py-3">{loadError}</p>}
              {!loadingRides && rides.length === 0 && <p className="text-sm text-inkMuted py-6 text-center">No available rides in {cityLabel} yet.</p>}
              {rides.map((ride) => (

                <RideCard
                  key={ride._id}
                  ride={ride}
                  selected={selectedId === ride._id}
                  onSelect={() => {
                    const nextRideId = selectedId === ride._id ? null : ride._id;
                    setSelectedId(nextRideId);
                    setSelectedSeats(1);
                    setBookingRequestId(null);
                    setBookingError("");
                    setBookingNotice("");
                    if (nextRideId) {
                      setPickupLocation({ name: ride.pickup.address, latitude: ride.pickup.lat, longitude: ride.pickup.lng });
                      setDestinationLocation({ name: ride.destination.address, latitude: ride.destination.lat, longitude: ride.destination.lng });
                    }
                  }}
                />

              ))}

            </div>

            {selectedRide && (
              <section className="mt-4 rounded-xl border border-cardBorder bg-card p-4" aria-label="Selected ride details">
                <h2 className="font-heading text-base font-semibold text-ink">Ride details</h2>
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div><dt className="text-inkMuted">Driver</dt><dd className="mt-0.5 font-medium text-ink">{selectedDriver}</dd></div>
                  <div><dt className="text-inkMuted">Departure</dt><dd className="mt-0.5 font-medium text-ink">{new Date(selectedRide.departureTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</dd></div>
                  <div><dt className="text-inkMuted">Pickup</dt><dd className="mt-0.5 font-medium text-ink">{selectedRide.pickup.address}</dd></div>
                  <div><dt className="text-inkMuted">Destination</dt><dd className="mt-0.5 font-medium text-ink">{selectedRide.destination.address}</dd></div>
                  <div><dt className="text-inkMuted">Fare per seat</dt><dd className="mt-0.5 font-medium text-ink">₹{selectedFare}</dd></div>
                  <div><dt className="text-inkMuted">Available seats</dt><dd className="mt-0.5 font-medium text-ink">{selectedRide.seatsAvailable}</dd></div>
                </dl>
                {bookingNotice && <p role="status" className="mt-3 rounded-lg bg-sage/15 px-3 py-2 text-sm text-sage">{bookingNotice} View it in <Link to="/my-rides" className="font-semibold underline">My rides</Link>.</p>}
                {bookingError && <p role="alert" className="mt-3 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{bookingError}</p>}
                {selectedRideIsOwn ? <p className="mt-3 text-sm text-coral">You can&apos;t book your own ride.</p> : alreadyBooked && !bookingNotice ? <p className="mt-3 text-sm text-sage">You already have an active booking for this ride.</p> : (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
                    <label className="text-xs text-inkMuted">Seats to book
                      <input type="number" min="1" max={selectedRide.seatsAvailable} step="1" value={Math.min(selectedSeats, Math.max(1, selectedRide.seatsAvailable))} onChange={(event) => setSelectedSeats(Math.max(1, Math.min(selectedRide.seatsAvailable, Number(event.target.value) || 1)))} disabled={selectedRide.seatsAvailable < 1 || bookingLoading || Boolean(bookingNotice)} className="block mt-1 w-24 rounded-lg border border-cardBorder bg-white px-3 py-2 text-sm text-ink disabled:opacity-60" />
                    </label>
                    <p className="text-sm text-ink">Total fare: <strong>{formatPaise(Math.round(Number(selectedFare) * 100))} × {selectedSeats} = {formatPaise(selectedTotalFarePaise)}</strong><span className="block text-xs text-inkMuted">Pay offline with the driver. Payment is not collected or verified here.</span></p>
                    <button type="button" disabled={bookingLoading || selectedRideIsOwn || selectedRide.seatsAvailable < 1 || Boolean(bookingNotice)} onClick={confirmBooking} className="sm:ml-auto rounded-lg bg-plum px-4 py-2.5 text-sm font-medium text-plumText hover:bg-rose transition-colors disabled:opacity-60">{bookingLoading ? "Confirming..." : "Confirm Booking"}</button>
                  </div>
                )}
              </section>
            )}

            <Link to="/find-ride" className="w-full mt-4 text-sm text-inkMuted hover:text-ink flex items-center justify-center gap-1 py-2">

              View all rides

              <ChevronDown size={14} />

            </Link>

          </div>

        </div>


        {/* =====================================================
            QUICK ACTIONS + RIDE HISTORY + BOOK RIDE
        ===================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">

          {/* QUICK ACTIONS */}

          <div className="card-base p-5">

            <h2 className="font-heading font-semibold text-sm mb-3">
              Quick actions
            </h2>

            <div className="grid grid-cols-2 gap-3">

              {quickActions.map(
                ({ label, icon: Icon, to }) => (

                  <Link
                    key={label}
                    to={to}
                    className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl bg-rose/10 text-rose hover:bg-rose/15 transition-colors text-center"
                  >

                    <Icon size={20} />

                    <span className="text-xs font-medium">
                      {label}
                    </span>

                  </Link>

                )
              )}

            </div>

          </div>


          {/* RIDE HISTORY */}

          <div className="card-base p-5">

            <div className="flex items-center justify-between mb-3">

              <h2 className="font-heading font-semibold text-sm">
                Ride history
              </h2>

              <Link
                to="/my-rides"
                className="text-xs text-rose flex items-center gap-0.5 hover:underline"
              >
                View all
                <ChevronRight size={12} />
              </Link>

            </div>

            <div className="flex flex-col divide-y divide-cardBorder">

              {rideHistory.map((booking) => (

                <div
                  key={booking._id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center gap-3"
                >

                  <div className="w-9 h-9 rounded-full bg-sage/20 flex items-center justify-center text-xs font-medium text-sageBright shrink-0">
                    {(booking.ride?.driver?.name || "RouteMate")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="text-sm font-medium truncate">
                      {booking.ride?.pickup.address} → {booking.ride?.destination.address}
                    </p>

                    <p className="text-xs text-inkMuted flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(booking.ride?.departureTime).toLocaleDateString()}
                    </p>

                  </div>

                  <div className="text-right shrink-0">

                    <p className="text-sm font-semibold">
                      ₹{(booking.ride?.fare || 0) * booking.seats}
                    </p>

                    <p className="text-[10px] text-sageBright">
                      {booking.status}
                    </p>

                  </div>

                </div>

              ))}

            </div>

          </div>


          {/* BOOK RIDE */}

          <div className="card-base p-5">

            <h2 className="font-heading font-semibold text-sm mb-3">
              Book ride
            </h2>

            <div className="flex gap-2 mb-3">

              <button className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-rose text-plumText">
                One way
              </button>

              <button className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-cream text-inkMuted border border-cardBorder">
                Round trip
              </button>

            </div>

            <div className="flex flex-col gap-2 mb-3">

              <div className="border border-cardBorder rounded-lg px-3 py-2 text-xs">

                <p className="text-inkMuted mb-0.5">
                  From
                </p>

                <p className="font-medium">
                  {cityLabel}
                </p>

              </div>

              <div className="border border-cardBorder rounded-lg px-3 py-2 text-xs">

                <p className="text-inkMuted mb-0.5">
                  To
                </p>

                <p className="font-medium">
                  Choose destination
                </p>

              </div>

            </div>

            <Link to="/find-ride" className="w-full py-2 rounded-lg text-sm font-medium bg-plum text-plumText hover:bg-plumCard transition-colors flex justify-center">
              Search rides
            </Link>

          </div>

        </div>


        {/* =====================================================
            COMMUNITY CTA
        ===================================================== */}

        <div className="mt-6 hero-overlay text-plumText rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">

          <div>

            <h2 className="font-heading font-semibold text-lg">
              Join the RouteMate community
            </h2>

            <p className="text-plumMuted text-sm mt-1 max-w-md">
              Find ride partners, share trips, and make new friends.
            </p>

          </div>

          <button className="shrink-0 px-5 py-2.5 rounded-lg bg-roseBright text-sm font-medium hover:brightness-110 transition">
            Explore community
          </button>

        </div>

      </div>

    </div>
  );
}