import { Star } from "lucide-react";

export default function RideCard({ ride, selected, onSelect }) {
  const rawDriverName = typeof ride.driver === "string"
    ? ride.driver.trim()
    : typeof ride.driver?.name === "string"
      ? ride.driver.name.trim()
      : "";
  const driverName = rawDriverName || "RouteMate driver";
  const initials = typeof ride.initials === "string" && ride.initials.trim()
    ? ride.initials
    : driverName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2);
  const badges = Array.isArray(ride.badges) ? ride.badges : [];
  const departure = ride.time || ride.departureLabel || (ride.departureTime
    ? new Date(ride.departureTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "");
  return (
    <div
      onClick={onSelect}
      className={`w-full cursor-pointer text-left bg-card rounded-xl p-4 transition-colors ${
        selected ? "border-2 border-rose" : "border border-cardBorder hover:border-inkMuted"
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex gap-3">
          <div className="w-11 h-11 rounded-full bg-sage/15 flex items-center justify-center text-sm font-medium text-sage shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-xs text-inkMuted mt-0.5">{driverName}</p>
            {ride.car && <p className="text-xs text-inkMuted mt-0.5">{ride.car}</p>}
            {departure && <p className="text-xs text-inkMuted mt-0.5">{departure}</p>}
            {ride.pickup?.address && ride.destination?.address && <p className="text-xs text-inkMuted mt-1">{ride.pickup.address} to {ride.destination.address}</p>}
            {ride.seatsAvailable !== undefined && <p className="text-xs text-inkMuted mt-1">{ride.seatsAvailable} seats available</p>}
            {ride.routeMatch && <p className="text-xs text-sage mt-1">Road fit: {Math.round(ride.routeMatch.detourSeconds / 60)} min estimated detour · {ride.routeMatch.routeDeviationMeters} m from route</p>}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {badges.map((b) => (
                <span
                  key={b}
                  className="text-[11px] bg-sage/12 text-sage px-2 py-0.5 rounded-md"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-heading font-semibold text-base text-ink">₹{ride.fare ?? ride.price}</p>
          <p className="text-xs text-inkMuted">/ seat</p>
          {ride.rating && <p className="text-xs text-inkMuted mt-1 flex items-center gap-1 justify-end">
            <Star size={11} className="fill-gold text-gold" />
            {ride.rating}{ride.reviews ? ` (${ride.reviews})` : ""}
          </p>}
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onSelect?.(); }}
          className="rounded-lg bg-cream px-3 py-1.5 text-xs font-medium text-plum hover:bg-rose/15 transition-colors"
        >
          View Ride
        </button>
      </div>
    </div>
  );
}
