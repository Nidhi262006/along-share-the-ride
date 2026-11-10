import { ArrowLeftRight, Calendar, ChevronDown, MapPin, Search, Users } from "lucide-react";

export default function TripSearchBar({
  pickup,
  destination,
  date,
  seats,
  onPickup,
  onDestination,
  onDate,
  onSeats,
  onSwap,
  onSubmit,
  pending = false,
  pickupPlaceholder = "Leaving from",
  destinationPlaceholder = "Going to",
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-[28px] border border-[#ece7f1] bg-white p-3 shadow-[0_18px_50px_rgba(42,36,56,0.08)] sm:p-4">
      <div className="grid grid-cols-1 items-end gap-2 lg:grid-cols-[1.15fr_auto_1.15fr_0.9fr_0.8fr_auto]">
        <label className="px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs text-[#8a8498]"><MapPin size={13} /> Leaving from</span>
          <input value={pickup} onChange={(event) => onPickup(event.target.value)} maxLength={200} required placeholder={pickupPlaceholder} className="mt-1 w-full bg-transparent text-sm font-medium text-[#241c33] outline-none placeholder:font-normal placeholder:text-[#b7b1c2]" />
        </label>
        <button type="button" onClick={onSwap} aria-label="Swap leaving from and going to" className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[#ece7f1] text-[#6d657c] hover:bg-[#f4f0f8]">
          <ArrowLeftRight size={16} />
        </button>
        <label className="border-t border-[#f0ebf4] px-3 py-2 lg:border-l lg:border-t-0">
          <span className="flex items-center gap-1.5 text-xs text-[#8a8498]"><MapPin size={13} /> Going to</span>
          <input value={destination} onChange={(event) => onDestination(event.target.value)} maxLength={200} required placeholder={destinationPlaceholder} className="mt-1 w-full bg-transparent text-sm font-medium text-[#241c33] outline-none placeholder:font-normal placeholder:text-[#b7b1c2]" />
        </label>
        <label className="border-t border-[#f0ebf4] px-3 py-2 lg:border-l lg:border-t-0">
          <span className="flex items-center gap-1.5 text-xs text-[#8a8498]"><Calendar size={13} /> Departure</span>
          <input type="date" value={date} onChange={(event) => onDate(event.target.value)} min={new Date().toISOString().slice(0, 10)} className="mt-1 w-full bg-transparent text-sm font-medium text-[#241c33] outline-none" />
        </label>
        <label className="border-t border-[#f0ebf4] px-3 py-2 lg:border-l lg:border-t-0">
          <span className="flex items-center gap-1.5 text-xs text-[#8a8498]"><Users size={13} /> Passengers</span>
          <span className="mt-1 flex items-center">
            <select value={seats} onChange={(event) => onSeats(Number(event.target.value))} aria-label="Passengers" className="w-full appearance-none bg-transparent text-sm font-medium text-[#241c33] outline-none">
              {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} passenger{count === 1 ? "" : "s"}</option>)}
            </select>
            <ChevronDown size={14} className="text-[#8a8498]" />
          </span>
        </label>
        <button disabled={pending} className="along-button h-14 rounded-2xl px-5 lg:mb-1">
          <Search size={16} /> {pending ? "Searching" : "Find a ride"}
        </button>
      </div>
    </form>
  );
}
