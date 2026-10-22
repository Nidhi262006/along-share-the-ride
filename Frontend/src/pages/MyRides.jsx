import { useEffect, useState } from "react";
import { Star, ChevronRight, CheckCircle2, X } from "lucide-react";
import RatingModal from "../components/RatingModal.jsx";
import { cancelBooking, listMyBookings } from "../services/rideService.js";
import FareShare from "../components/FareShare.jsx";
import { createReport } from "../services/reportService.js";

const REVIEWS_KEY = "routemate-ride-reviews";

function loadReviews() {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function MyRides() {
  const [reviews, setReviews] = useState(loadReviews);
  const [bookings, setBookings] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [reportBookingId, setReportBookingId] = useState(null);
  const [reportCategory, setReportCategory] = useState("other");
  const [reportDescription, setReportDescription] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  async function refreshBookings() {
    setLoading(true);
    setError("");
    try {
      setBookings(await listMyBookings());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshBookings();
  }, []);

  useEffect(() => {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
  }, [reviews]);

  const submitReview = (data) => {
    setReviews({ ...reviews, [activeRide.id]: data });
    setActiveRide(null);
  };

  async function cancel(booking) {
    setBusyId(booking._id);
    setError("");
    try {
      await cancelBooking(booking._id);
      await refreshBookings();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function submitReport(booking) {
    setReportBusy(true);
    setError("");
    setReportNotice("");
    try {
      const driverId = typeof booking.ride.driver === "object" ? booking.ride.driver?._id : booking.ride.driver;
      await createReport({ category: reportCategory, description: reportDescription, rideId: booking.ride._id, reportedUserId: driverId });
      setReportNotice("Report sent to RouteMate administrators.");
      setReportBookingId(null);
      setReportDescription("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setReportBusy(false);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="font-heading text-2xl font-semibold text-ink mb-6">My rides</h1>

      {error && <p role="alert" className="mb-4 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
      {loading ? <p className="py-10 text-center text-sm text-inkMuted">Loading your bookings...</p> : bookings.length === 0 ? <div className="rounded-xl border border-cardBorder bg-card px-5 py-10 text-center text-sm text-inkMuted">You have no bookings yet.</div> : <div className="flex flex-col gap-2">
        {bookings.map((booking) => {
          const ride = booking.ride;
          const review = reviews[ride._id];
          const route = `${booking.pickup?.address || ride.pickup.address} → ${booking.dropoff?.address || ride.destination.address}`;
          const departed = new Date(ride.departureTime) <= new Date();
          const active = ["pending", "confirmed"].includes(booking.status);
          const status = booking.status === "pending" ? "Awaiting driver approval" : booking.status === "rejected" ? "Declined" : booking.status === "cancelled" ? "Cancelled" : booking.status === "completed" ? "Completed" : departed ? "Past" : "Upcoming";
          const farePerSeat = booking.farePerSeat ?? ride.fare;
          const totalFare = booking.totalFare ?? farePerSeat * booking.seats;
          return (
            <>
            <div
              key={booking._id}
              className="flex flex-col sm:flex-row sm:items-center justify-between bg-card border border-cardBorder rounded-xl px-4 py-3.5 hover:border-inkMuted transition-colors gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{route}</p>
                <p className="text-xs text-inkMuted mt-1">
                  ₹{farePerSeat} × {booking.seats} seats = ₹{totalFare} · {new Date(ride.departureTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <p className="text-xs text-inkMuted mt-0.5 flex items-center gap-1">
                  {ride.driver?.name || "RouteMate driver"}
                  <span className="ml-1 text-sage">· {status}</span>
                  <span className="ml-1 text-inkMuted">· Offline payment {booking.paymentStatus || "pending"}</span>
                </p>
                <FareShare booking={booking} />
              </div>

              {booking.status === "completed" && (
                review ? (
                  <span className="shrink-0 flex items-center gap-1.5 text-xs text-sage bg-sage/10 rounded-full px-3 py-1.5">
                    <CheckCircle2 size={13} /> You rated {review.stars}/5
                  </span>
                ) : (
                  <button
                    onClick={() => setActiveRide({ id: ride._id, driver: ride.driver?.name || "your driver", route, date: new Date(ride.departureTime).toLocaleDateString() })}
                    className="shrink-0 text-xs font-medium text-rose border border-cardBorder rounded-lg px-4 py-2 self-start sm:self-auto"
                  >
                    Rate driver
                  </button>
                )
              )}

              <div className="flex flex-wrap gap-2 shrink-0">
                {active && !departed && <button disabled={busyId === booking._id} onClick={() => cancel(booking)} className="text-xs text-coral border border-cardBorder rounded-lg px-3 py-2 flex items-center gap-1 disabled:opacity-60"><X size={13} />{busyId === booking._id ? "Cancelling..." : "Cancel booking"}</button>}
                <button type="button" onClick={() => { setReportBookingId(reportBookingId === booking._id ? null : booking._id); setReportDescription(""); setReportNotice(""); }} className="text-xs border border-cardBorder rounded-lg px-3 py-2">Report issue</button>
              </div>

              <ChevronRight size={16} className="text-inkMuted shrink-0 hidden sm:block" />
            </div>
            {reportBookingId === booking._id && <form onSubmit={(event) => { event.preventDefault(); submitReport(booking); }} className="basis-full rounded-lg bg-cream p-3">
              <label className="text-xs text-inkMuted">Category<select value={reportCategory} onChange={(event) => setReportCategory(event.target.value)} className="ml-2 rounded border border-cardBorder bg-white px-2 py-1 text-ink"><option value="safety">Safety</option><option value="inappropriate_listing">Inappropriate listing</option><option value="no_show">No-show</option><option value="other">Other</option></select></label>
              <textarea required minLength={20} maxLength={2000} rows={3} value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} placeholder="Describe what happened (20 to 2000 characters)" className="mt-2 w-full rounded-lg border border-cardBorder bg-white p-2 text-sm outline-none" />
              <button disabled={reportBusy} className="rounded-lg bg-plum px-3 py-2 text-xs text-white disabled:opacity-60">{reportBusy ? "Sending..." : "Submit report"}</button>
            </form>}
            </>
          );
        })}
      </div>}

      {activeRide && (
        <RatingModal
          ride={activeRide}
          onClose={() => setActiveRide(null)}
          onSubmit={submitReview}
        />
      )}
    </div>
  );
}