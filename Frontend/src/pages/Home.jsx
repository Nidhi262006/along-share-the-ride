import { useEffect, useState } from "react";
import { ArrowRight, Clock3, Leaf, Search, Users, WalletCards } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PassengerHero from "../components/dashboard/PassengerHero.jsx";
import RideResultCard from "../components/dashboard/RideResultCard.jsx";
import RealMap from "../components/RealMap.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { createBooking, listMyBookings, searchRides } from "../services/rideService.js";

const tabs = ["Recommended", "Fastest", "Cheapest"];
const quickActions = [
  { label: "Find a ride", icon: Search, to: "/find-ride" },
  { label: "My bookings", icon: Users, to: "/my-rides" },
  { label: "Messages", icon: Clock3, to: "/messages" },
  { label: "Wallet", icon: WalletCards, to: "/wallet" },
];

function formatPaise(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function locationFor(point) {
  return point ? { name: point.address, latitude: point.lat, longitude: point.lng } : null;
}

export default function Home() {
  const navigate = useNavigate();
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

  const cityLabel = user?.serviceCity === "bengaluru" ? "Bengaluru" : user?.serviceCity === "nagpur" ? "Nagpur" : "your selected city";
  const selectedRide = rides.find((ride) => ride._id === selectedId);
  const selectedFare = Number(selectedRide?.fare ?? selectedRide?.price ?? 0);
  const selectedTotalFarePaise = Math.round(selectedFare * 100) * selectedSeats;
  const selectedDriverId = typeof selectedRide?.driver === "object"
    ? selectedRide.driver?._id || selectedRide.driver?.id
    : selectedRide?.driver;
  const selectedRideIsOwn = Boolean(selectedDriverId && user?.id && String(selectedDriverId) === String(user.id));
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

  function selectRide(ride) {
    const nextId = selectedId === ride._id ? null : ride._id;
    setSelectedId(nextId);
    setSelectedSeats(1);
    setBookingRequestId(null);
    setBookingError("");
    setBookingNotice("");
  }

  return (
    <div className="min-h-full bg-[#fbf9fd] pb-14">
      <PassengerHero
        cityLabel={cityLabel}
        onSearch={(search) => navigate("/find-ride", { state: { search } })}
      />
      {!user?.serviceCity && (
        <p role="status" className="mx-auto mt-4 max-w-[1320px] px-4 text-sm text-[#6f687c] sm:px-6 lg:px-8">
          Select your service city from the account menu before searching for rides.
        </p>
      )}

      <section className="mx-auto grid max-w-[1320px] gap-8 px-4 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(290px,0.8fr)] lg:px-8 lg:pt-14">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="along-kicker">A seat with your name on it</p>
              <h2 className="along-title mt-2 text-3xl sm:text-4xl">Find your next ride.</h2>
            </div>
            <Link to="/find-ride" className="inline-flex items-center gap-2 text-sm font-medium text-[#514665] hover:text-[#241c33]">
              Explore all rides <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mb-4 flex flex-wrap gap-2" aria-label="Ride recommendations">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-xs transition ${activeTab === tab ? "bg-[#2a2438] text-white" : "border border-[#e5deeb] bg-white text-[#6f687c] hover:bg-[#f4f0f8]"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {loadingRides && <p className="rounded-2xl bg-[#f4f0f8] px-5 py-8 text-center text-sm text-[#8a8498]">Finding available rides...</p>}
            {loadError && <p role="alert" className="rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">{loadError}</p>}
            {!loadingRides && !loadError && rides.length === 0 && (
              <p className="rounded-2xl bg-[#f4f0f8] px-5 py-8 text-center text-sm text-[#8a8498]">No available rides in {cityLabel} yet.</p>
            )}
            {rides.map((ride) => (
              <RideResultCard key={ride._id} ride={ride} selected={selectedId === ride._id} onSelect={() => selectRide(ride)} />
            ))}
          </div>

          {selectedRide && (
            <section className="mt-4 rounded-2xl border border-[#e7e0ed] bg-white p-5" aria-label="Selected ride details">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="along-kicker">Ride details</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#241c33]">{selectedRide.pickup.address} → {selectedRide.destination.address}</h3>
                </div>
                <p className="text-sm font-semibold text-[#241c33]">₹{selectedFare} <span className="font-normal text-[#8a8498]">/ seat</span></p>
              </div>
              <p className="mt-2 text-sm text-[#6f687c]">{selectedRide.driver?.name || "RouteMate driver"} · {new Date(selectedRide.departureTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {selectedRide.seatsAvailable} seats left</p>
              {bookingNotice && <p role="status" className="mt-4 rounded-xl bg-sage/15 px-3 py-2 text-sm text-sage">{bookingNotice} <Link to="/my-rides" className="font-semibold underline">View My rides</Link>.</p>}
              {bookingError && <p role="alert" className="mt-4 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral">{bookingError}</p>}
              {selectedRideIsOwn ? <p className="mt-4 text-sm text-coral">You can&apos;t book your own ride.</p> : alreadyBooked && !bookingNotice ? <p className="mt-4 text-sm text-sage">You already have an active booking for this ride.</p> : (
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <label className="text-xs text-[#8a8498]">Seats to book
                    <input type="number" min="1" max={selectedRide.seatsAvailable} step="1" value={Math.min(selectedSeats, Math.max(1, selectedRide.seatsAvailable))} onChange={(event) => setSelectedSeats(Math.max(1, Math.min(selectedRide.seatsAvailable, Number(event.target.value) || 1)))} disabled={selectedRide.seatsAvailable < 1 || bookingLoading || Boolean(bookingNotice)} className="mt-1 block w-20 rounded-lg border border-[#e5deeb] bg-[#fbf9fd] px-3 py-2 text-sm text-[#241c33] disabled:opacity-60" />
                  </label>
                  <p className="text-sm text-[#241c33]">Total <strong>{formatPaise(selectedTotalFarePaise)}</strong><span className="block text-xs text-[#8a8498]">Payment is made offline with the driver.</span></p>
                  <button type="button" disabled={bookingLoading || selectedRideIsOwn || selectedRide.seatsAvailable < 1 || Boolean(bookingNotice)} onClick={confirmBooking} className="along-button ml-auto rounded-xl px-5 py-2.5 text-xs">{bookingLoading ? "Confirming..." : "Confirm booking"}</button>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <div className="overflow-hidden rounded-[22px] border border-[#e7e0ed] bg-white">
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <div><p className="along-kicker">Your route</p><h2 className="mt-1 text-base font-semibold text-[#241c33]">See the way ahead</h2></div>
              <Leaf size={18} className="text-[#7655a4]" />
            </div>
            <div className="h-[270px]">
              <RealMap city={user?.serviceCity} pickupLocation={locationFor(selectedRide?.pickup)} destinationLocation={locationFor(selectedRide?.destination)} />
            </div>
          </div>

          <div className="rounded-[22px] bg-[#f4f0f8] p-5">
            <p className="along-kicker">A smaller footprint</p>
            <h2 className="mt-2 font-display text-2xl text-[#241c33]">One road.<br /><span className="italic">More possibility.</span></h2>
            <p className="mt-3 text-sm leading-6 text-[#81788f]">Sharing a ride means fewer cars on the road. A small choice that goes a long way.</p>
            <Link to="/safety" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#514665]">Why we share <ArrowRight size={14} /></Link>
          </div>
        </aside>
      </section>

      <section className="mx-auto mt-10 grid max-w-[1320px] gap-5 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div className="rounded-[22px] border border-[#e7e0ed] bg-white p-5 sm:p-6">
          <p className="along-kicker">Your RouteMate</p>
          <h2 className="mt-2 text-lg font-semibold text-[#241c33]">Quick links</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {quickActions.map(({ label, icon: Icon, to }) => (
              <Link key={to} to={to} className="flex items-center gap-2 rounded-xl bg-[#f4f0f8] px-3 py-3 text-xs font-medium text-[#514665] transition hover:bg-[#ece5f3]">
                <Icon size={16} /> {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-[22px] border border-[#e7e0ed] bg-white p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><p className="along-kicker">Good to see you again</p><h2 className="mt-2 text-lg font-semibold text-[#241c33]">Recent bookings</h2></div>
            <Link to="/my-rides" className="text-xs font-medium text-[#514665] hover:underline">View all</Link>
          </div>
          {rideHistory.length === 0 ? <p className="py-5 text-sm text-[#8a8498]">Your bookings will appear here.</p> : (
            <div className="divide-y divide-[#eee9f2]">
              {rideHistory.map((booking) => (
                <div key={booking._id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ece6f3] text-xs font-semibold text-[#6d4ea3]">{booking.ride?.driver?.name?.split(/\s+/).map((part) => part[0]).join("").slice(0, 2) || "RM"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#241c33]">{booking.ride?.pickup?.address} → {booking.ride?.destination?.address}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#8a8498]"><Clock3 size={11} />{booking.ride?.departureTime ? new Date(booking.ride.departureTime).toLocaleDateString() : "Date unavailable"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#241c33]">₹{(booking.farePerSeat ?? booking.ride?.fare ?? 0) * (booking.seats || 1)}</p>
                    <p className="text-[10px] capitalize text-[#8a8498]">{booking.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-[22px] bg-[#f4f0f8] p-7 sm:p-9 md:grid-cols-2 md:items-center">
          <div><p className="along-kicker text-[#2a2438]">The road is for everyone</p><h2 className="mt-3 font-display text-3xl leading-tight text-[#241c33]">A journey shared.<br /><span className="italic">A day made better.</span></h2></div>
          <div><p className="text-sm leading-7 text-[#81788f]">For the early birds, weekend wanderers, and familiar faces on your daily commute. RouteMate brings people heading the same way a little closer together.</p><p className="mt-4 flex items-center gap-2 text-sm text-[#514665]"><Leaf size={17} /> Fewer cars, more possibilities.</p></div>
        </div>
      </section>
    </div>
  );
}
