import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { splitFareInPaise } from "../utils/fare.js";
import { formatPlace } from "../utils/display.js";

function formatPaise(paise) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Copy failed");
}

export default function FareShare({ booking }) {
  const ride = booking.ride;
  const totalPaise = Number.isSafeInteger(booking.totalFarePaise)
    ? booking.totalFarePaise
    : Math.round(Number(booking.totalFare ?? (booking.farePerSeat ?? ride.fare) * booking.seats) * 100);
  const farePerSeatPaise = Number.isSafeInteger(booking.farePerSeatPaise)
    ? booking.farePerSeatPaise
    : Math.round(Number(booking.farePerSeat ?? ride.fare) * 100);
  const shareGroups = splitFareInPaise(totalPaise, booking.seats);
  const [notice, setNotice] = useState("");
  const pickupAddress = booking.pickup?.address || ride.pickup.address;
  const dropoffAddress = booking.dropoff?.address || ride.destination.address;
  const pickup = formatPlace(pickupAddress);
  const dropoff = formatPlace(dropoffAddress);
  const cancelled = ["cancelled", "rejected"].includes(booking.status);
  const departure = new Date(ride.departureTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  const shares = shareGroups.map((share) => `${share.people} person${share.people === 1 ? "" : "s"}: ${formatPaise(share.eachPaise)} each`).join("; ");
  const summary = [
    `along trip: ${pickup} to ${dropoff}`,
    `Departure: ${departure}`,
    `Fare per seat: ${formatPaise(farePerSeatPaise)}`,
    `Seats booked: ${booking.seats}`,
    `Total booking fare: ${formatPaise(totalPaise)}`,
    `Suggested equal shares: ${shares}`,
    cancelled
      ? "This booking was cancelled or declined. along does not claim an offline refund occurred; resolve any offline settlement directly with the driver."
      : "The booking passenger is responsible for the full fare. Friends settle suggested shares privately; these are not payments made to along.",
  ].join("\n");

  async function shareFare() {
    setNotice("");
    try {
      if (navigator.share) {
        await navigator.share({ title: "along fare summary", text: summary });
        return;
      }
      await copyText(summary);
      setNotice("Fare summary copied.");
    } catch (error) {
      if (error.name === "AbortError") return;
      try {
        await copyText(summary);
        setNotice("Fare summary copied.");
      } catch {
        setNotice("Sharing is unavailable in this browser.");
      }
    }
  }

  async function copyFare() {
    try {
      await copyText(summary);
      setNotice("Fare summary copied.");
    } catch {
      setNotice("Clipboard access is unavailable in this browser.");
    }
  }

  return <section title={`${pickupAddress} to ${dropoffAddress}`} className="mt-3 rounded-lg bg-cream p-3" aria-label="Fare breakdown and sharing">
    <h3 className="text-xs font-semibold text-ink">Fare breakdown</h3>
    <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs"><dt className="text-inkMuted">Fare per seat</dt><dd className="text-right">{formatPaise(farePerSeatPaise)}</dd><dt className="text-inkMuted">Seats booked</dt><dd className="text-right">{booking.seats}</dd><dt className="font-medium">Booking total</dt><dd className="text-right font-semibold">{formatPaise(totalPaise)}</dd><dt className="text-inkMuted">Suggested shares</dt><dd className="text-right">{shares}</dd></dl>
    <p className="text-[11px] text-inkMuted mt-2">{cancelled ? "This booking is no longer active. along does not claim an offline refund occurred; resolve any offline settlement directly." : "You remain responsible for the full offline booking fare. Friends settle privately; along does not track reimbursements."}</p>
    {booking.status === "confirmed" && <div className="flex gap-2 mt-3"><button type="button" onClick={shareFare} className="inline-flex items-center gap-1.5 rounded-lg bg-plum px-3 py-2 text-xs text-white"><Share2 size={14} />Share summary</button><button type="button" onClick={copyFare} className="inline-flex items-center gap-1.5 rounded-lg border border-cardBorder px-3 py-2 text-xs"><Copy size={14} />Copy text</button></div>}
    {booking.status === "pending" && <p className="mt-3 text-xs text-inkMuted">The driver must confirm this route request before you share the booking summary.</p>}
    {notice && <p role="status" className="mt-2 text-xs text-sage">{notice}</p>}
  </section>;
}