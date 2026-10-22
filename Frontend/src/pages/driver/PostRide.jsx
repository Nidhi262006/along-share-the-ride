import { useEffect, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { searchLocation } from "../../services/locationService.js";
import { createRide, listDriverRides, updateRide } from "../../services/rideService.js";

function localDateTime(value) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function PostRide() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cityLabel = user?.serviceCity === "bengaluru" ? "Bengaluru" : "Nagpur";
  const [form, setForm] = useState({ pickupAddress: "", destinationAddress: "", stops: [], departureTime: localDateTime(), seats: 1, fare: "", instructions: "" });
  const [loading, setLoading] = useState(Boolean(rideId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!rideId) return;
    let active = true;
    listDriverRides().then((rides) => {
      const ride = rides.find((item) => item._id === rideId);
      if (!ride) throw new Error("Ride not found in your posted rides");
      if (active) setForm({
        pickupAddress: ride.pickup.address,
        destinationAddress: ride.destination.address,
        stops: (ride.stops || []).sort((first, second) => first.order - second.order).map((stop) => stop.address),
        departureTime: localDateTime(ride.departureTime),
        seats: ride.seats,
        fare: ride.fare,
        instructions: ride.instructions || "",
      });
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [rideId]);

  async function pointFor(address) {
    const result = await searchLocation(`${address}, ${cityLabel}, India`);
    const cityPattern = user?.serviceCity === "bengaluru" ? /bengaluru|bangalore/i : /nagpur/i;
    const fullAddress = cityPattern.test(result.name) ? result.name : `${result.name}, ${cityLabel}`;
    return { lat: result.latitude, lng: result.longitude, address: fullAddress };
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const [pickup, destination] = await Promise.all([
        pointFor(form.pickupAddress),
        pointFor(form.destinationAddress),
      ]);
      const stops = await Promise.all(form.stops.filter((stop) => stop.trim()).map(pointFor));
      const ride = {
        pickup,
        destination,
        stops,
        departureTime: new Date(form.departureTime).toISOString(),
        seats: Number(form.seats),
        fare: Number(form.fare),
        instructions: form.instructions.trim(),
      };
      if (rideId) {
        await updateRide(rideId, ride);
        setNotice("Ride updated successfully.");
      } else {
        await createRide(ride);
        setNotice("Your ride has been published.");
        setForm((current) => ({ ...current, pickupAddress: "", destinationAddress: "", instructions: "" }));
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to find one of those locations in the selected city.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-[#f7f3ed] p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/driver/rides" className="inline-flex items-center gap-2 text-sm text-inkMuted hover:text-ink"><ArrowLeft size={16} /> My rides</Link>
        <header className="mt-5 mb-6">
          <p className="text-xs text-inkMuted">{cityLabel} service area</p>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold text-ink mt-1">{rideId ? "Edit ride" : "Post a ride"}</h1>
        </header>
        {loading ? <p className="text-sm text-inkMuted">Loading ride...</p> : <form onSubmit={submit} className="bg-white border border-cardBorder rounded-xl p-5 sm:p-6 space-y-4">
          <label className="block">
            <span className="text-xs text-inkMuted">Pickup location</span>
            <div className="mt-1 flex items-center gap-2 rounded-lg bg-cream px-3 py-2.5"><MapPin size={16} className="text-inkMuted shrink-0" /><input required maxLength={180} value={form.pickupAddress} onChange={(event) => setForm({ ...form, pickupAddress: event.target.value })} placeholder={`Address in ${cityLabel}`} className="w-full bg-transparent text-sm text-ink outline-none" /></div>
          </label>
          <label className="block">
            <span className="text-xs text-inkMuted">Destination</span>
            <div className="mt-1 flex items-center gap-2 rounded-lg bg-cream px-3 py-2.5"><MapPin size={16} className="text-inkMuted shrink-0" /><input required maxLength={180} value={form.destinationAddress} onChange={(event) => setForm({ ...form, destinationAddress: event.target.value })} placeholder={`Address in ${cityLabel}`} className="w-full bg-transparent text-sm text-ink outline-none" /></div>
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="text-xs text-inkMuted">Intermediate stops (in route order)</span><button type="button" onClick={() => setForm({ ...form, stops: [...form.stops, ""] })} className="text-xs text-rose">Add stop</button></div>
            {form.stops.map((stop, index) => <div key={index} className="flex gap-2"><input required maxLength={180} value={stop} onChange={(event) => setForm({ ...form, stops: form.stops.map((value, item) => item === index ? event.target.value : value) })} placeholder={`Stop ${index + 1} in ${cityLabel}`} className="w-full rounded-lg bg-cream px-3 py-2.5 text-sm text-ink outline-none" /><button type="button" onClick={() => setForm({ ...form, stops: form.stops.filter((_, item) => item !== index) })} aria-label={`Remove stop ${index + 1}`} className="px-3 text-coral">×</button></div>)}
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block"><span className="text-xs text-inkMuted">Departure</span><input required type="datetime-local" min={localDateTime()} value={form.departureTime} onChange={(event) => setForm({ ...form, departureTime: event.target.value })} className="mt-1 w-full rounded-lg bg-cream px-3 py-2.5 text-sm text-ink outline-none" /></label>
            <label className="block"><span className="text-xs text-inkMuted">Available seats</span><input required type="number" min="1" step="1" value={form.seats} onChange={(event) => setForm({ ...form, seats: event.target.value })} className="mt-1 w-full rounded-lg bg-cream px-3 py-2.5 text-sm text-ink outline-none" /></label>
            <label className="block"><span className="text-xs text-inkMuted">Fare per passenger (₹)</span><input required type="number" min="0" max="100000" step="1" value={form.fare} onChange={(event) => setForm({ ...form, fare: event.target.value })} className="mt-1 w-full rounded-lg bg-cream px-3 py-2.5 text-sm text-ink outline-none" /></label>
          </div>
          <label className="block"><span className="text-xs text-inkMuted">Ride instructions (optional)</span><textarea maxLength={500} rows={3} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Pickup details or notes for passengers" className="mt-1 w-full rounded-lg bg-cream px-3 py-2.5 text-sm text-ink outline-none resize-y" /></label>
          <p className="text-xs text-inkMuted">Fares are informational. RouteMate does not collect or transfer payment.</p>
          {error && <p role="alert" className="text-sm text-coral">{error}</p>}
          {notice && <p role="status" className="text-sm text-sage">{notice}</p>}
          <button disabled={saving} className="w-full rounded-lg bg-rose py-3 text-sm font-medium text-plumText disabled:opacity-60">{saving ? "Saving..." : rideId ? "Save ride changes" : "Publish ride"}</button>
        </form>}
      </div>
    </div>
  );
}
