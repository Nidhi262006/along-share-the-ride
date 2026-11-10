import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import PassengerRequestList from "../components/PassengerRequestList.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { searchLocation } from "../services/locationService.js";
import { createRideRequest } from "../services/rideService.js";

function localDateTime(value) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function RideRequest() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const search = location.state?.search || {};
  const cityLabel = user?.serviceCity === "bengaluru" ? "Bengaluru" : "Nagpur";
  const [form, setForm] = useState({
    pickup: search.pickup || "",
    destination: search.destination || "",
    departureTime: localDateTime(search.departureTime),
    passengers: search.seats || 1,
    note: "",
    maxFarePerSeat: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  async function pointFor(address) {
    const point = await searchLocation(`${address}, ${cityLabel}, India`);
    const cityPattern = user?.serviceCity === "bengaluru" ? /bengaluru|bangalore/i : /nagpur/i;
    const fullAddress = cityPattern.test(point.name) ? point.name : `${point.name}, ${cityLabel}`;
    return { lat: point.latitude, lng: point.longitude, address: fullAddress };
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const [pickup, destination] = await Promise.all([pointFor(form.pickup), pointFor(form.destination)]);
      await createRideRequest({
        pickup,
        destination,
        departureTime: new Date(form.departureTime).toISOString(),
        passengers: Number(form.passengers),
        note: form.note.trim(),
        ...(form.maxFarePerSeat !== "" ? { maxFarePerSeat: Number(form.maxFarePerSeat) } : {}),
      });
      setNotice("Your ride request is now visible to drivers.");
      setForm((current) => ({ ...current, note: "", maxFarePerSeat: "" }));
      setRefreshToken((current) => current + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="min-h-full bg-[#fbf9fd] px-4 py-8 sm:px-6 lg:px-8">
    <main className="mx-auto max-w-3xl">
      <Link to="/find-ride" className="inline-flex items-center gap-2 text-sm text-[#6f687c] hover:text-[#241c33]"><ArrowLeft size={16} /> Find a ride</Link>
      <header className="mb-6 mt-5">
        <p className="along-kicker">{cityLabel} service area</p>
        <h1 className="along-title mt-2 text-3xl">Request a ride</h1>
        <p className="mt-2 text-sm text-[#6f687c]">Share your route and departure details with drivers.</p>
      </header>
      {!user?.serviceCity && <p role="status" className="mb-4 rounded-lg bg-[#f4f0f8] p-3 text-sm text-[#6f687c]">Choose a service city in your account before requesting a ride.</p>}
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[#e7e0ed] bg-white p-5 sm:p-6">
        <label className="block"><span className="text-xs text-[#6f687c]">From</span>
          <span className="mt-1 flex items-center gap-2 rounded-lg bg-[#f7f4fa] px-3 py-2.5"><MapPin size={16} className="shrink-0 text-[#8a8498]" /><input required maxLength={180} value={form.pickup} onChange={(event) => setForm({ ...form, pickup: event.target.value })} placeholder={`Pickup in ${cityLabel}`} className="w-full bg-transparent text-sm outline-none" /></span>
        </label>
        <label className="block"><span className="text-xs text-[#6f687c]">To</span>
          <span className="mt-1 flex items-center gap-2 rounded-lg bg-[#f7f4fa] px-3 py-2.5"><MapPin size={16} className="shrink-0 text-[#8a8498]" /><input required maxLength={180} value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} placeholder="Destination" className="w-full bg-transparent text-sm outline-none" /></span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="text-xs text-[#6f687c]">Date and time</span><input required type="datetime-local" min={localDateTime()} value={form.departureTime} onChange={(event) => setForm({ ...form, departureTime: event.target.value })} className="mt-1 w-full rounded-lg bg-[#f7f4fa] px-3 py-2.5 text-sm outline-none" /></label>
          <label className="block"><span className="text-xs text-[#6f687c]">Passengers</span><input required type="number" min="1" step="1" value={form.passengers} onChange={(event) => setForm({ ...form, passengers: event.target.value })} className="mt-1 w-full rounded-lg bg-[#f7f4fa] px-3 py-2.5 text-sm outline-none" /></label>
          <label className="block"><span className="text-xs text-[#6f687c]">Maximum fare per seat (optional)</span><input type="number" min="0" max="100000" step="0.01" value={form.maxFarePerSeat} onChange={(event) => setForm({ ...form, maxFarePerSeat: event.target.value })} className="mt-1 w-full rounded-lg bg-[#f7f4fa] px-3 py-2.5 text-sm outline-none" /></label>
        </div>
        <label className="block"><span className="text-xs text-[#6f687c]">Note (optional)</span><textarea maxLength={500} rows={3} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Add pickup details or anything a driver should know" className="mt-1 w-full resize-y rounded-lg bg-[#f7f4fa] px-3 py-2.5 text-sm outline-none" /></label>
        {error && <p role="alert" className="text-sm text-coral">{error}</p>}
        {notice && <p role="status" className="text-sm text-sage">{notice}</p>}
        <button type="submit" disabled={saving || !user?.serviceCity} className="along-button w-full rounded-xl py-3 text-sm disabled:opacity-60">{saving ? "Submitting..." : "Submit ride request"}</button>
      </form>
      <PassengerRequestList refreshToken={refreshToken} />
      <button type="button" onClick={() => navigate("/my-rides")} className="mt-5 text-xs font-medium text-[#514665] hover:underline">View bookings</button>
    </main>
  </div>;
}
