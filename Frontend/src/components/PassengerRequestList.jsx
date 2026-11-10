import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cancelRideRequest, listMyRideRequests } from "../services/rideService.js";
import { formatPlace } from "../utils/display.js";

export default function PassengerRequestList({ refreshToken = 0 }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    listMyRideRequests().then((items) => {
      if (active) {
        setRequests(items);
        setError("");
      }
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [refreshToken]);

  async function cancelRequest(request) {
    setBusyId(request._id);
    setError("");
    try {
      const updated = await cancelRideRequest(request._id);
      setRequests((current) => current.map((item) => item._id === updated._id ? updated : item));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-[#241c33]">My requests</h2>
      {error && <p role="alert" className="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
      {loading ? <p className="rounded-xl border border-cardBorder bg-white px-4 py-8 text-center text-sm text-inkMuted">Loading your ride requests...</p>
        : requests.length === 0 ? <p className="rounded-xl border border-cardBorder bg-white px-4 py-8 text-center text-sm text-inkMuted">You have not requested a ride yet.</p>
          : <div className="space-y-3">{requests.map((request) => {
            const route = `${formatPlace(request.pickup.address)} → ${formatPlace(request.destination.address)}`;
            return <article key={request._id} className="flex flex-col gap-3 rounded-xl border border-cardBorder bg-white p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p title={`${request.pickup.address} → ${request.destination.address}`} className="line-clamp-2 text-sm font-medium text-[#241c33]">{route}</p>
                <p className="mt-1 text-xs text-inkMuted">{new Date(request.departureTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {request.passengers} passenger{request.passengers === 1 ? "" : "s"}{request.maxFarePerSeat !== null ? ` · Up to ₹${request.maxFarePerSeat}/seat` : ""}</p>
                {request.note && <p className="mt-1 line-clamp-2 text-xs text-inkMuted">{request.note}</p>}
              </div>
              <span className={`w-fit rounded-full px-3 py-1.5 text-xs capitalize ${request.status === "accepted" ? "bg-sage/15 text-sage" : request.status === "cancelled" ? "bg-cream text-inkMuted" : "bg-[#f4f0f8] text-[#514665]"}`}>{request.status}</span>
              {request.status === "open" && <button type="button" disabled={busyId === request._id} onClick={() => cancelRequest(request)} className="inline-flex items-center gap-1 self-start rounded-lg border border-cardBorder px-3 py-2 text-xs text-coral disabled:opacity-60 sm:self-auto">
                <X size={13} />{busyId === request._id ? "Cancelling..." : "Cancel"}
              </button>}
            </article>;
          })}</div>}
    </section>
  );
}
