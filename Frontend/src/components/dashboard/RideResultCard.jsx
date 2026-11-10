function driverNameOf(ride) {
  if (typeof ride.driver === "string" && ride.driver.trim()) return ride.driver.trim();
  if (typeof ride.driver?.name === "string" && ride.driver.name.trim()) return ride.driver.name.trim();
  return "RouteMate driver";
}

function clock(value) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function RideResultCard({ ride, selected, onSelect }) {
  const driverName = driverNameOf(ride);
  const initials = driverName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const verified = Boolean(ride.driver?.isVerified || ride.badges?.includes("Verified driver"));
  const departure = ride.departureTime ? new Date(ride.departureTime) : null;

  return (
    <article className={`rounded-[18px] border border-[#e7e0ed] bg-[#f4f0f8] p-4 sm:p-5 ${selected ? "ring-2 ring-[#2a2438]" : ""}`}>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-6">
        <div>
          <p className="font-display text-3xl text-[#241c33] sm:text-4xl">{departure ? clock(departure) : "--"}</p>
          <p className="mt-1 max-w-[9rem] truncate text-sm text-[#6f687c]">{ride.pickup?.address || "Pickup"}</p>
        </div>
        <div className="min-w-0 text-center">
          <p className="text-xs text-[#8a8498]">{departure ? departure.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "Shared route"}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-px flex-1 bg-[#ddd6e6]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#c8bfd4]" />
            <span className="h-px flex-1 bg-[#ddd6e6]" />
          </div>
          <p className="mt-2 text-sm font-medium text-[#241c33]">₹{ride.fare ?? ride.price} / seat</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#6f687c]">{ride.seatsAvailable ?? 0} seats left</p>
          <p className="mt-6 max-w-[10rem] text-sm font-medium leading-5 text-[#241c33] ml-auto">{ride.destination?.address || "Drop-off"}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-4 border-t border-[#e7e1ee] pt-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ece6f3] text-xs font-semibold text-[#4d4560]">{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#241c33]">{driverName}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {verified && <span className="rounded-full bg-[#ece6f4] px-2 py-0.5 text-[11px] text-[#5c546c]">Verified driver</span>}
              {ride.routeMatch && <span className="rounded-full bg-[#ece6f4] px-2 py-0.5 text-[11px] text-[#5c546c]">{Math.round(ride.routeMatch.detourSeconds / 60)} min detour</span>}
            </div>
          </div>
        </div>
        <button type="button" onClick={onSelect} className="along-button shrink-0 rounded-xl px-4 py-2.5 text-xs">
          {selected ? "Hide ride" : "View ride"} <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}
