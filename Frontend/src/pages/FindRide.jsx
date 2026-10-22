import { useEffect, useState } from "react";
import { MapPin, Calendar, ArrowDownUp, LocateFixed } from "lucide-react";
import RideCard from "../components/RideCard.jsx";
import RealMap from "../components/RealMap.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getCurrentLocation, searchLocation } from "../services/locationService.js";
import { createBooking, searchRideMatches } from "../services/rideService.js";
import { parseRideRequest } from "../services/assistantService.js";

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
  const { user } = useAuth();
  const cityLabel = user?.serviceCity === "bengaluru" ? "Bengaluru" : "Nagpur";
  const [tripType, setTripType] = useState("One Way");
  const [form, setForm] = useState({ pickup: "", destination: "", departureTime: "" });
  const [pickupPoint, setPickupPoint] = useState(null);
  const [destinationPoint, setDestinationPoint] = useState(null);
  const [sort, setSort] = useState("departure");
  const [requestedSeats, setRequestedSeats] = useState(1);
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
      setAssistantMessage("I found the search details. Review them below; the rides and availability come from RouteMate search.");
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
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="font-heading text-2xl font-semibold text-ink mb-6">Book a ride</h1>

      <form onSubmit={askAssistant} className="bg-white border border-cardBorder rounded-xl p-4 mb-5">
        <label className="block text-sm font-medium text-ink">Ride assistant
          <textarea value={assistantText} onChange={(event) => setAssistantText(event.target.value)} maxLength={1500} rows={2} placeholder="Describe your route, time and number of seats" className="mt-2 w-full rounded-lg bg-cream px-3 py-2.5 text-sm outline-none resize-y" />
        </label>
        <button type="submit" disabled={assistantBusy || !assistantText.trim()} className="mt-2 rounded-lg bg-plum px-4 py-2 text-sm text-white disabled:opacity-60">{assistantBusy ? "Understanding request..." : "Find rides from request"}</button>
        {assistantMessage && <p role="status" className="mt-2 text-sm text-inkMuted">{assistantMessage}</p>}
      </form>

      <div className="bg-card border border-cardBorder rounded-xl p-5 mb-6">
        <div className="flex gap-2 mb-4">
          {["One Way", "Round Trip"].map((type) => (
            <button
              key={type}
              onClick={() => setTripType(type)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                tripType === type
                  ? "bg-rose text-plumText font-medium"
                  : "bg-cream text-inkMuted"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <form onSubmit={search} className="flex flex-col gap-3">
          <label className="flex items-center gap-3 bg-cream rounded-lg px-3 py-2.5">
            <MapPin size={16} className="text-inkMuted shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-inkMuted">From</p>
              <div className="flex items-center gap-2">
                <input
                  value={form.pickup}
                  onChange={(event) => { setForm({ ...form, pickup: event.target.value }); setPickupPoint(null); }}
                  placeholder={`Pickup in ${cityLabel}`}
                  maxLength={200}
                  aria-label="Pickup location"
                  className="bg-transparent text-sm outline-none w-full text-ink"
                />
                <button type="button" onClick={() => useGps("pickup")} title="Use current location for pickup" aria-label="Use current location for pickup" className="shrink-0 text-inkMuted hover:text-ink"><LocateFixed size={16} /></button>
              </div>
            </div>
          </label>
          <label className="flex items-center gap-3 bg-cream rounded-lg px-3 py-2.5">
            <MapPin size={16} className="text-inkMuted shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-inkMuted">To</p>
              <div className="flex items-center gap-2">
                <input
                  value={form.destination}
                  onChange={(event) => { setForm({ ...form, destination: event.target.value }); setDestinationPoint(null); }}
                  placeholder="Destination"
                  maxLength={200}
                  aria-label="Destination"
                  className="bg-transparent text-sm outline-none w-full text-ink"
                />
                <button type="button" onClick={() => useGps("destination")} title="Use current location for destination" aria-label="Use current location for destination" className="shrink-0 text-inkMuted hover:text-ink"><LocateFixed size={16} /></button>
              </div>
            </div>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 bg-cream rounded-lg px-3 py-2.5">
              <Calendar size={16} className="text-inkMuted shrink-0" />
              <input
                type="datetime-local"
                value={form.departureTime}
                onChange={(event) => setForm({ ...form, departureTime: event.target.value })}
                min={localDateTime()}
                aria-label="Departure date and time"
                className="bg-transparent text-sm outline-none w-full text-ink"
              />
            </label>
            <label className="flex items-center gap-3 bg-cream rounded-lg px-3 py-2.5">
              <span className="text-xs text-inkMuted shrink-0">Seats</span>
              <input
                type="number"
                min="1"
                step="1"
                value={requestedSeats}
                onChange={(event) => setRequestedSeats(Math.max(1, Number(event.target.value) || 1))}
                aria-label="Requested seats"
                className="bg-transparent text-sm outline-none w-full text-ink"
              />
            </label>
          </div>

          <button disabled={loading} className="w-full mt-1 bg-rose text-plumText font-medium text-sm rounded-lg py-2.5 hover:bg-roseBright transition-colors disabled:opacity-60">
            {loading ? "Searching..." : "Search rides"}
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm text-inkMuted">{loading ? "Searching rides..." : `${rides.length} ${rides.length === 1 ? "ride" : "rides"} found`}</h2>
        <label className="flex items-center gap-2 text-xs text-inkMuted">
          <ArrowDownUp size={14} />
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent text-ink outline-none">
            <option value="departure">Departure time</option>
            <option value="fare">Lowest fare</option>
            <option value="availability">Most seats</option>
          </select>
        </label>
      </div>
      {!loading && matching?.method === "road-route-estimate" && matching.available && <p className="mb-3 text-xs text-inkMuted">Ranked by road-route fit. Detour limits use OSRM duration estimates (up to {matching.maxDetourMinutes} minutes).</p>}
      {!loading && matching?.available === false && <p role="status" className="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">Route checks are incomplete because the road-routing service did not return usable data for {matching.unavailableRoutes} ride{matching.unavailableRoutes === 1 ? "" : "s"}. Results may be incomplete.</p>}
      {!loading && matching?.method === "not-applied" && <p className="mb-3 text-xs text-inkMuted">Enter both locations to see rides ranked by road-route fit.</p>}
      {notice && <p role="status" className="mb-3 rounded-lg bg-sage/15 px-3 py-2 text-sm text-sage">{notice}</p>}
      {error && <p role="alert" className="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
      <div className="flex flex-col gap-3">
        {!loading && !error && matching?.available !== false && rides.length === 0 && <div className="rounded-xl border border-cardBorder bg-card px-5 py-10 text-center text-sm text-inkMuted">No available rides match your search in {cityLabel}. Try a different date or route.</div>}
        {rides.map((ride) => (
          <RideCard
            key={ride._id}
            ride={{ ...ride, driver: ride.driver?.name || "RouteMate driver", time: departureLabel(ride.departureTime), price: ride.fare, badges: ride.driver?.isVerified ? ["Verified driver"] : [] }}
            selected={selectedRide?._id === ride._id}
            onSelect={() => { setNotice(""); setBookingRequestId(null); setSeats(Math.max(1, Math.min(requestedSeats, ride.seatsAvailable))); setSelectedRide(selectedRide?._id === ride._id ? null : ride); }}
          />
        ))}
      </div>
      {selectedRide && <section className="mt-4 rounded-xl border border-cardBorder bg-card p-4" aria-label="Selected ride details">
        <h3 className="text-sm font-semibold text-ink">Ride details</h3>
        {selectedRideIsOwn && <p className="mt-2 text-sm text-coral">You can&apos;t book your own ride.</p>}
        <p className="mt-2 text-xs text-inkMuted">Pickup: {pickupPoint?.name || selectedRide.pickup.address}</p>
        <p className="mt-1 text-xs text-inkMuted">Drop-off: {destinationPoint?.name || selectedRide.destination.address}</p>
        {selectedRide.stops?.length > 0 && <p className="mt-1 text-xs text-inkMuted">Driver stops: {[...selectedRide.stops].sort((first, second) => first.order - second.order).map((stop) => stop.address).join(" → ")}</p>}
        <p className="mt-1 text-xs text-inkMuted">{departureLabel(selectedRide.departureTime)} · {selectedRide.seatsAvailable} seats remaining</p>
        {selectedRide.routeMatch && <p className="mt-1 text-xs text-inkMuted">OSRM estimated detour: {(selectedRide.routeMatch.detourSeconds / 60).toFixed(1)} min · Combined endpoint map distance from route: {selectedRide.routeMatch.routeDeviationMeters} m</p>}
        {selectedRide.instructions && <p className="mt-2 text-xs text-inkMuted">Driver instructions: {selectedRide.instructions}</p>}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="text-xs text-inkMuted">Seats
            <input type="number" min="1" max={selectedRide.seatsAvailable} value={seats} onChange={(event) => setSeats(Math.max(1, Math.min(selectedRide.seatsAvailable, Number(event.target.value) || 1)))} className="block mt-1 w-24 rounded-lg border border-cardBorder bg-white px-3 py-2 text-sm text-ink" />
          </label>
          <p className="text-sm text-ink">Fare review: <strong>{formatPaise(Math.round(selectedRide.fare * 100))} × {seats} = {formatPaise(selectedTotalFarePaise)}</strong><span className="block text-xs text-inkMuted">Pay offline with the driver. Payment is not collected or verified here.</span></p>
          <button disabled={booking || selectedRideIsOwn || selectedRide.seatsAvailable < 1} onClick={bookSelectedRide} className="sm:ml-auto rounded-lg bg-rose px-4 py-2.5 text-sm font-medium text-plumText disabled:opacity-60">{booking ? "Confirming..." : "Confirm booking"}</button>
        </div>
      </section>}
      {selectedRide && <div className="mt-5 h-72 overflow-hidden rounded-xl"><RealMap city={user?.serviceCity} pickupLocation={mapLocation(selectedRide.pickup)} destinationLocation={mapLocation(selectedRide.destination)} /></div>}
    </div>
  );
}
