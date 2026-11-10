import { useState } from "react";
import { ArrowLeftRight, CalendarDays, Compass, MapPin, Search, Users } from "lucide-react";

function localDate(value) {
  const date = value ? new Date(value) : new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export default function PassengerHero({ cityLabel, onSearch }) {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(() => localDate());
  const [seats, setSeats] = useState(1);

  function swapLocations() {
    setPickup(destination);
    setDestination(pickup);
  }

  function submit(event) {
    event.preventDefault();
    const departure = new Date(`${date}T09:00`);
    const now = new Date();
    if (departure <= now) departure.setTime(now.getTime() + 60 * 60 * 1000);
    onSearch({
      pickup: pickup.trim(),
      destination: destination.trim(),
      departureTime: date ? `${departure.getFullYear()}-${String(departure.getMonth() + 1).padStart(2, "0")}-${String(departure.getDate()).padStart(2, "0")}T${String(departure.getHours()).padStart(2, "0")}:${String(departure.getMinutes()).padStart(2, "0")}` : "",
      seats,
    });
  }

  return (
    <section className="relative mx-auto max-w-[1320px] px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
      <div className="relative flex min-h-[700px] flex-col overflow-hidden rounded-[24px] bg-[#f0eaf6] px-6 pb-5 pt-9 sm:min-h-[660px] sm:px-10 sm:pt-10 md:min-h-[620px] lg:block lg:min-h-[510px] lg:px-12 lg:pb-40 lg:pt-10">
        <div className="absolute right-3 top-24 hidden h-[330px] w-[48%] rotate-[2deg] rounded-lg border-[8px] border-white bg-[#d5c6e1] shadow-[0_14px_0_0_#d0bfdc] lg:block" />
        <div
          className="absolute right-5 top-20 hidden h-[330px] w-[48%] rounded-lg border-[8px] border-white bg-cover bg-center shadow-xl lg:block"
          style={{ backgroundImage: "url('/home-bg.png')" }}
          role="img"
          aria-label="A car travelling along a mountain road at sunset"
        />
        <div className="relative z-10 max-w-xl pb-8 lg:pb-0">
          <p className="along-kicker flex items-center gap-2 text-[#2a2438]"><span className="h-1.5 w-1.5 rounded-full bg-[#7655a4]" /> Good company. Great journeys.</p>
          <h1 className="mt-8 font-display text-[clamp(2.7rem,6.6vw,4.7rem)] leading-[0.98] tracking-[-0.055em] text-[#241c33]">
            Same direction.<br />
            <span className="font-normal italic">Better together.</span>
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-7 text-[#81788f] sm:text-base">
            Turn an empty seat into a new connection.<br className="hidden sm:block" />
            Find your people. Share the road.
          </p>
        </div>
        <div className="absolute bottom-28 right-[34%] z-10 hidden -rotate-6 rounded-xl bg-[#2a2438] px-5 py-3 text-white shadow-lg lg:flex lg:items-center lg:gap-3">
          <Compass size={22} className="text-[#9c72c7]" />
          <span className="text-xs leading-5">A little less solo.<br /><strong>A lot more possibility.</strong></span>
        </div>
        <p className="absolute right-12 top-10 hidden text-[10px] uppercase tracking-[0.16em] text-[#8a8498] lg:block">Your next chapter starts here ↗</p>
        <form onSubmit={submit} className="relative z-20 mt-auto w-full rounded-[18px] border border-[#e7e0ed] bg-white/95 p-3 shadow-[0_18px_48px_rgba(42,36,56,0.12)] backdrop-blur sm:p-4 lg:absolute lg:inset-x-[30px] lg:bottom-5 lg:mt-0 lg:w-auto">
          <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_0.85fr_0.8fr_auto] lg:items-center">
            <label className="px-2 py-2">
              <span className="flex items-center gap-1.5 text-xs text-[#8a8498]"><MapPin size={13} /> Leaving from</span>
              <input value={pickup} onChange={(event) => setPickup(event.target.value)} maxLength={200} required placeholder={cityLabel} className="mt-1 w-full bg-transparent text-sm font-medium text-[#241c33] outline-none placeholder:font-normal placeholder:text-[#b7b1c2]" />
            </label>
            <button type="button" onClick={swapLocations} aria-label="Swap leaving from and going to" className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-[#ece7f1] text-[#6d657c] hover:bg-[#f4f0f8] lg:mb-1">
              <ArrowLeftRight size={15} />
            </button>
            <label className="border-t border-[#f0ebf4] px-2 py-2 lg:border-l lg:border-t-0">
              <span className="flex items-center gap-1.5 text-xs text-[#8a8498]"><MapPin size={13} /> Going to</span>
              <input value={destination} onChange={(event) => setDestination(event.target.value)} maxLength={200} required placeholder="Choose destination" className="mt-1 w-full bg-transparent text-sm font-medium text-[#241c33] outline-none placeholder:font-normal placeholder:text-[#b7b1c2]" />
            </label>
            <label className="border-t border-[#f0ebf4] px-2 py-2 lg:border-l lg:border-t-0">
              <span className="flex items-center gap-1.5 text-xs text-[#8a8498]"><CalendarDays size={13} /> Departure</span>
              <input type="date" value={date} min={localDate()} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full bg-transparent text-sm font-medium text-[#241c33] outline-none" />
            </label>
            <label className="border-t border-[#f0ebf4] px-2 py-2 lg:border-l lg:border-t-0">
              <span className="flex items-center gap-1.5 text-xs text-[#8a8498]"><Users size={13} /> Passengers</span>
              <select value={seats} onChange={(event) => setSeats(Number(event.target.value))} aria-label="Passengers" className="mt-1 w-full bg-transparent text-sm font-medium text-[#241c33] outline-none">
                {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} passenger{count === 1 ? "" : "s"}</option>)}
              </select>
            </label>
            <button className="along-button h-12 rounded-xl px-4 text-xs lg:ml-1"><Search size={16} /> Find a ride</button>
          </div>
        </form>
      </div>
    </section>
  );
}
