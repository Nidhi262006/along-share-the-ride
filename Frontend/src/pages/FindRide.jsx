import { useEffect, useState } from "react";
import { ArrowDownUp, Calendar, Leaf, LocateFixed, MapPin, SlidersHorizontal } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import RideResultCard from "../components/dashboard/RideResultCard.jsx";
import RealMap from "../components/RealMap.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getCurrentLocation, searchLocation } from "../services/locationService.js";
import { createBooking, searchRideMatches } from "../services/rideService.js";
import { parseRideRequest } from "../services/assistantService.js";
import { formatPlace } from "../utils/display.js";

function departureLabel(value) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatPaise(paise) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100);
}

function localDateTime(value) {
  const date = value ? new Date(value) : new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function FindRide() {
  const location = useLocation();
  const { user } = useAuth();
  const cityLabel = user?.serviceCity === "bengaluru" ? "Bengaluru" : user?.serviceCity === "nagpur" ? "Nagpur" : "your selected city";
  const [form, setForm] = useState(() => ({
    pickup: location.state?.search?.pickup || "",
    destination: location.state?.search?.destination || "",
    departureTime: location.state?.search?.departureTime || "",
  }));
  const [pickupPoint, setPickupPoint] = useState(null);
  const [destinationPoint, setDestinationPoint] = useState(null);
  const [sort, setSort] = useState("departure");
  const [requestedSeats, setRequestedSeats] = useState(location.state?.search?.seats || 1);
  const [rides, setRides] = useState([]);
  const [matching, setMatching] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookingRequestId, setBookingRequestId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState("");
  const [assistantContext, setAssistantContext] = useState(null);
  const selectedRideDriverId = typeof selectedRide?.driver === "object"
    ? selectedRide.driver?._id || selectedRide.driver?.id
    : selectedRide?.driver;
  const selectedRideIsOwn = Boolean(selectedRideDriverId && user?.id && String(selectedRideDriverId) === String(user.id));
  const selectedTotalFarePaise = Math.round(Number(selectedRide?.fare || 0) * 100) * seats;

  async function loadRides(filters = {}, seatCount = requestedSeats, points = { pickup: pickupPoint, destination: destinationPoint }, sortBy = sort) {
    setLoading(true);
    setError("");
    try {
      const searchFilters = { ...filters, seats: seatCount, sort: sortBy };
      if (filters.pickup || filters.destination) {
        if (!filters.pickup.trim() || !filters.destination.trim()) {
          throw new Error("Enter both pickup and destination to match a route.");
        }
        const [pickup, destination] = await Promise.all([
          points.pickup || searchLocation(`${filters.pickup}, ${cityLabel}, India`),
          points.destination || searchLocation(`${filters.destination}, ${cityLabel}, India`),
        ]);
        setPickupPoint(pickup);
        setDestinationPoint(destination);
        searchFilters.pickup = cityLabel;
        searchFilters.pickupLat = pickup.latitude;
        searchFilters.pickupLng = pickup.longitude;
        searchFilters.destination = cityLabel;
        searchFilters.destinationLat = destination.latitude;
        searchFilters.destinationLng = destination.longitude;
      }
      if (filters.departureTime) {
        searchFilters.departureTime = new Date(filters.departureTime).toISOString();
      }
      const result = await searchRideMatches(searchFilters);
      setRides(result.rides);
      setMatching(result.matching);
      setSelectedRide((current) => result.rides.find((ride) => ride._id === current?._id) || null);
    } catch (requestError) {
      setError(requestError.message);
      setRides([]);
      setMatching(null);
      setSelectedRide(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRides(form);
  }, [sort]);

  async function search(event) {
    event.preventDefault();
    setNotice("");
    await loadRides(form, requestedSeats, { pickup: pickupPoint, destination: destinationPoint });
  }

  async function useGps(endpoint) {
    setError("");
    try {
      const location = await getCurrentLocation(cityLabel);
      const point = { lat: location.latitude, lng: location.longitude };
      if (endpoint === "pickup") {
        setForm((current) => ({ ...current, pickup: location.name }));
        setPickupPoint({ ...location, ...point });
      } else {
        setForm((current) => ({ ...current, destination: location.name }));
        setDestinationPoint({ ...location, ...point });
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function askAssistant(event) {
    event.preventDefault();
    setAssistantBusy(true);
    setAssistantMessage("");
    setError("");
    try {
      const result = await parseRideRequest(assistantText, assistantContext);
      if (result.needsClarification || result.fallback || result.cityMismatch) {
        setAssistantMessage(result.clarifyingQuestion || result.message);
        if (result.needsClarification) {
          setAssistantContext({
            previousRequest: `${assistantContext?.previousRequest ? `${assistantContext.previousRequest}\n` : ""}${assistantText}`.slice(-1500),
            clarifyingQuestion: result.clarifyingQuestion,
          });
        }
        return;
      }
      const nextForm = {
        pickup: result.request.origin,
        destination: result.request.destination,
        departureTime: localDateTime(result.request.departureTime),
      };
      setForm(nextForm);
      setRequestedSeats(result.request.seats);
      setSort(result.request.sort);
      setPickupPoint(null);
      setDestinationPoint(null);
      setAssistantContext(null);
      setAssistantMessage("Search details are ready. Review them below.");
      await loadRides(nextForm, result.request.seats, {}, result.request.sort);
    } catch (requestError) {
      setAssistantMessage(`${requestError.message}. You can continue with the normal search form.`);
    } finally {
      setAssistantBusy(false);
    }
  }

  async function bookSelectedRide() {
    if (!selectedRide || selectedRideIsOwn) return;
    setBooking(true);
    setError("");
    setNotice("");
    try {
      const requestId = bookingRequestId || crypto.randomUUID();
      setBookingRequestId(requestId);
      const toPoint = (point, fallback) => point
        ? { address: point.name, lat: point.latitude, lng: point.longitude }
        : { address: fallback.address, lat: fallback.lat, lng: fallback.lng };
      const routeProposal = pickupPoint && destinationPoint ? {
        pickup: toPoint(pickupPoint, selectedRide.pickup),
        dropoff: toPoint(destinationPoint, selectedRide.destination),
      } : {};
      const createdBooking = await createBooking(selectedRide._id, seats, routeProposal, {
        expectedUpdatedAt: selectedRide.updatedAt,
        expectedFarePaise: Math.round(selectedRide.fare * 100),
        expectedSeatsAvailable: selectedRide.seatsAvailable,
      }, requestId);
      setNotice(createdBooking.status === "pending"
        ? `Route request sent for ${seats} seat${seats === 1 ? "" : "s"}. The seats are held while the driver reviews the pickup and drop-off; no payment is collected.`
        : `Booking confirmed: ${seats} seat${seats === 1 ? "" : "s"} for ₹${createdBooking.totalFare}. Pay offline with the driver; payment is still pending.`);
      setBookingRequestId(null);
      setSelectedRide(null);
      await loadRides(form);
    } catch (requestError) {
      await loadRides(form);
      setError(requestError.message);
    } finally {
      setBooking(false);
    }
  }

  const mapLocation = (point) => point ? { name: point.address, latitude: point.lat, longitude: point.lng } : null;

  return (
    <div className="min-h-full bg-[#fbf9fd] pb-14">
      <section className="mx-auto max-w-[1320px] px-4 pb-6 pt-8 sm:px-6 lg:px-8 lg:pt-10">
        <p className="along-kicker">Available rides</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="along-title text-3xl sm:text-4xl">Find a ride</h1><p className="mt-2 text-sm text-[#8a8498]">Search upcoming rides in {cityLabel}.</p></div>
          <span className="rounded-full border border-[#e7e0ed] px-3 py-1.5 text-[11px] text-[#8a8498]">Available rides</span>
        </div>
        {!user?.serviceCity && <p role="status" className="mt-3 text-sm text-[#6f687c]">Select your service city from the account menu before searching for rides.</p>}
      </section>

      <div className="mx-auto grid max-w-[1320px] items-start gap-8 px-4 sm:px-6 lg:grid-cols-[268px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-5 lg:sticky lg:top-24">
          <section className="rounded-[20px] border-r border-[#e7e0ed] bg-transparent p-0 lg:rounded-none lg:border-r lg:pr-7">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#514665]"><SlidersHorizontal size={17} /> Filter rides</div>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              {[
                { value: "departure", label: "Earliest departure" },
                { value: "fare", label: "Lowest fare" },
                { value: "availability", label: "Most seats" },
              ].map((item) => (
                <button key={item.value} type="button" aria-pressed={sort === item.value} onClick={() => setSort(item.value)} className={`rounded-xl border px-3 py-3 text-left text-xs transition ${sort === item.value ? "border-[#d3c3e3] bg-[#eee7f5] font-medium text-[#2a2438]" : "border-[#e7e0ed] bg-white text-[#625a70] hover:bg-[#f7f3fa]"}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <form onSubmit={askAssistant} className="rounded-[18px] border border-[#e7e0ed] bg-white p-4">
            <label className="block text-sm font-medium text-[#514665]">Ride assistant
              <textarea value={assistantText} onChange={(event) => setAssistantText(event.target.value)} maxLength={1500} rows={3} placeholder="Describe your route, time and seats" className="mt-2 w-full resize-y rounded-xl bg-[#f7f4fa] px-3 py-2.5 text-xs text-[#241c33] outline-none focus:ring-2 focus:ring-[#d8c8e8]" />
            </label>
            <button type="submit" disabled={assistantBusy || !assistantText.trim()} className="mt-3 rounded-xl bg-[#2a2438] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#1c1728] disabled:opacity-60">{assistantBusy ? "Understanding..." : "Search from request"}</button>
            {assistantMessage && <p role="status" className="mt-3 text-xs leading-5 text-[#6f687c]">{assistantMessage}</p>}
          </form>

          <div className="rounded-[18px] bg-[#f4f0f8] p-4">
            <Leaf size={21} className="text-[#81788f]" />
            <h2 className="mt-3 font-display text-xl text-[#241c33]">Why share rides?</h2>
            <p className="mt-2 text-xs leading-5 text-[#81788f]">Shared rides can reduce the number of cars on the road.</p>
          </div>
        </aside>

        <main className="min-w-0">
          <form onSubmit={search} className="mb-6 rounded-[20px] border border-[#e7e0ed] bg-white p-3 shadow-[0_12px_35px_rgba(42,36,56,0.05)] sm:p-4">
            <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_0.85fr_0.55fr_auto] lg:items-center">
              <label className="px-2 py-2">
                <span className="flex items-center gap-1.5 text-xs text-[#8a8498]"><MapPin size={13} /> Leaving from</span>
                <span className="mt-1 flex items-center gap-2">
                  <input value={form.pickup} onChange={(event) => { setForm({ ...form, pickup: event.target.value }); setPickupPoint(null); }} placeholder={cityLabel} maxLength={200} aria-label="Pickup location" className="w-full bg-transparent text-sm font-medium text-[#241c33] outline-none placeholder:font-normal placeholder:text-[#b7b1c2]" />
                  <button type="button" onClick={() => useGps("pickup")} title="Use current location for pickup" aria-label="Use current location for pickup" className="shrink-0 text-[#8a8498] hover:text-[#241c33]"><LocateFixed size={15} /></button>
                </span>
              </label>
              <span className="mx-auto hidden h-8 w-8 items-center justify-center rounded-full border border-[#ece7f1] text-[#8a8498] lg:flex"><ArrowDownUp size={14} /></span>
              <label className="border-t border-[#f0ebf4] px-2 py-2 lg:border-l lg:border-t-0">
                <span className="flex items-center gap-1.5 text-xs text-[#8a8498]"><MapPin size={13} /> Going to</span>
                <span className="mt-1 flex items-center gap-2">
                  <input value={form.destination} onChange={(event) => { setForm({ ...form, destination: event.target.value }); setDestinationPoint(null); }} placeholder="Choose destination" maxLength={200} aria-label="Destination" className="w-full bg-transparent text-sm font-medium text-[#241c33] outline-none placeholder:font-normal placeholder:text-[#b7b1c2]" />
                  <button type="button" onClick={() => useGps("destination")} title="Use current location for destination" aria-label="Use current location for destination" className="shrink-0 text-[#8a8498] hover:text-[#241c33]"><LocateFixed size={15} /></button>
                </span>
              </label>
              <label className="border-t border-[#f0ebf4] px-2 py-2 lg:border-l lg:border-t-0">
                <span className="flex items-center gap-1.5 text-xs text-[#8a8498]"><Calendar size={13} /> Departure</span>
                <input type="datetime-local" value={form.departureTime} onChange={(event) => setForm({ ...form, departureTime: event.target.value })} min={localDateTime()} aria-label="Departure date and time" className="mt-1 w-full bg-transparent text-sm font-medium text-[#241c33] outline-none" />
              </label>
              <label className="border-t border-[#f0ebf4] px-2 py-2 lg:border-l lg:border-t-0">
                <span className="text-xs text-[#8a8498]">Passengers</span>
                <select value={requestedSeats} onChange={(event) => setRequestedSeats(Number(event.target.value))} aria-label="Requested passengers" className="mt-1 w-full bg-transparent text-sm font-medium text-[#241c33] outline-none">
                  {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
              </label>
              <button disabled={loading} className="along-button h-12 rounded-xl px-4 text-xs lg:ml-1">{loading ? "Searching..." : "Find a ride"}</button>
            </div>
          </form>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 title={form.pickup && form.destination ? `${form.pickup} → ${form.destination}` : undefined} className="text-sm font-semibold text-[#241c33]">{loading ? "Finding rides..." : `${rides.length} ${rides.length === 1 ? "ride" : "rides"} · ${form.pickup && form.destination ? `${formatPlace(form.pickup)} → ${formatPlace(form.destination)}` : `Available in ${cityLabel}`}`}</h2>
              <p className="mt-1 text-xs text-[#8a8498]">{form.departureTime ? new Date(form.departureTime).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "Choose a route and departure time"}</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-[#8a8498]"><ArrowDownUp size={14} />
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent text-[#514665] outline-none">
                <option value="departure">Earliest departure</option><option value="fare">Lowest fare</option><option value="availability">Most seats</option>
              </select>
            </label>
          </div>
          {!loading && matching?.method === "road-route-estimate" && matching.available && <p className="mb-3 text-xs text-[#8a8498]">Ranked by road-route fit. Detour limits use OSRM duration estimates (up to {matching.maxDetourMinutes} minutes).</p>}
          {!loading && matching?.available === false && <p role="status" className="mb-3 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral">Route checks are incomplete because the road-routing service did not return usable data for {matching.unavailableRoutes} ride{matching.unavailableRoutes === 1 ? "" : "s"}. Results may be incomplete.</p>}
          {!loading && matching?.method === "not-applied" && <p className="mb-3 text-xs text-[#8a8498]">Enter both locations to see rides ranked by road-route fit.</p>}
          {notice && <p role="status" className="mb-3 rounded-xl bg-sage/15 px-3 py-2 text-sm text-sage">{notice}</p>}
          {error && <p role="alert" className="mb-3 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

          <div className="space-y-3">
            {!loading && !error && matching?.available !== false && rides.length === 0 && (
              <div className="rounded-2xl bg-[#f4f0f8] px-5 py-8 text-center">
                <p className="text-sm text-[#6f687c]">No rides match this route and departure time in {cityLabel}.</p>
                {form.pickup.trim() && form.destination.trim() && <Link
                  to="/ride-request"
                  state={{ search: { pickup: form.pickup, destination: form.destination, departureTime: form.departureTime, seats: requestedSeats } }}
                  className="along-button mt-4 inline-flex rounded-xl px-4 py-2.5 text-xs"
                >Request this ride</Link>}
              </div>
            )}
            {rides.map((ride) => (
              <RideResultCard
                key={ride._id}
                ride={ride}
                selected={selectedRide?._id === ride._id}
                onSelect={() => { setNotice(""); setBookingRequestId(null); setSeats(Math.max(1, Math.min(requestedSeats, ride.seatsAvailable))); setSelectedRide(selectedRide?._id === ride._id ? null : ride); }}
              />
            ))}
          </div>

          {selectedRide && (
            <section className="mt-4 rounded-[20px] border border-[#e7e0ed] bg-white p-5" aria-label="Selected ride details">
              <p className="along-kicker">Ride details</p>
              <h3 title={`${selectedRide.pickup.address} → ${selectedRide.destination.address}`} className="mt-2 line-clamp-2 text-base font-semibold text-[#241c33]">{formatPlace(selectedRide.pickup.address)} → {formatPlace(selectedRide.destination.address)}</h3>
              {selectedRideIsOwn && <p className="mt-2 text-sm text-coral">You can&apos;t book your own ride.</p>}
              <p title={pickupPoint?.name || selectedRide.pickup.address} className="mt-2 text-xs text-[#6f687c]">Pickup: {formatPlace(pickupPoint?.name || selectedRide.pickup.address)}</p>
              <p title={destinationPoint?.name || selectedRide.destination.address} className="mt-1 text-xs text-[#6f687c]">Drop-off: {formatPlace(destinationPoint?.name || selectedRide.destination.address)}</p>
              {selectedRide.stops?.length > 0 && <p title={[...selectedRide.stops].sort((first, second) => first.order - second.order).map((stop) => stop.address).join(" → ")} className="mt-1 line-clamp-2 text-xs text-[#6f687c]">Driver stops: {[...selectedRide.stops].sort((first, second) => first.order - second.order).map((stop) => formatPlace(stop.address)).join(" → ")}</p>}
              <p className="mt-1 text-xs text-[#6f687c]">{departureLabel(selectedRide.departureTime)} · {selectedRide.seatsAvailable} seats remaining</p>
              {selectedRide.routeMatch && <p className="mt-1 text-xs text-[#6f687c]">OSRM estimated detour: {(selectedRide.routeMatch.detourSeconds / 60).toFixed(1)} min · Combined endpoint map distance from route: {selectedRide.routeMatch.routeDeviationMeters} m</p>}
              {selectedRide.instructions && <p className="mt-2 text-xs text-[#6f687c]">Driver instructions: {selectedRide.instructions}</p>}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="text-xs text-[#8a8498]">Seats
                  <input type="number" min="1" max={selectedRide.seatsAvailable} value={seats} onChange={(event) => setSeats(Math.max(1, Math.min(selectedRide.seatsAvailable, Number(event.target.value) || 1)))} className="mt-1 block w-24 rounded-lg border border-[#e5deeb] bg-[#fbf9fd] px-3 py-2 text-sm text-[#241c33]" />
                </label>
                <p className="text-sm text-[#241c33]">Total <strong>{formatPaise(selectedTotalFarePaise)}</strong><span className="block text-xs text-[#8a8498]">Payment is made offline with the driver.</span></p>
                <button disabled={booking || selectedRideIsOwn || selectedRide.seatsAvailable < 1} onClick={bookSelectedRide} className="along-button sm:ml-auto rounded-xl px-5 py-2.5 text-xs">{booking ? "Confirming..." : "Confirm booking"}</button>
              </div>
            </section>
          )}
          {selectedRide && <div className="mt-5 h-[320px] overflow-hidden rounded-[20px]"><RealMap city={user?.serviceCity} pickupLocation={mapLocation(selectedRide.pickup)} destinationLocation={mapLocation(selectedRide.destination)} /></div>}
        </main>
      </div>
    </div>
  );
}
