import { useEffect, useState } from "react";
import { ArrowRight, Bell, CarFront, Check, Clock3, IndianRupee, MoreHorizontal, Navigation, Plus, Users, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import RealMap from "../../components/RealMap.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listDriverRides } from "../../services/rideService.js";
const requests = [];

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestState, setRequestState] = useState({});
  const decide = (id, value) => setRequestState({ ...requestState, [id]: value });

  useEffect(() => {
    let active = true;
    listDriverRides().then((result) => { if (active) setRides(result); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const upcomingRide = rides.find((ride) => ["open", "full"].includes(ride.status) && new Date(ride.departureTime) > new Date());
  const currentRide = upcomingRide || rides[0];
  const activeRides = rides.filter((ride) => ["open", "full"].includes(ride.status));
  return (
    <div className="min-h-full bg-[#f7f3ed] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-7">
          <div><p className="text-xs text-inkMuted">Driver dashboard</p><h1 className="font-heading text-2xl sm:text-3xl font-semibold text-ink mt-1">Good morning, {user?.name?.split(" ")[0] || "Driver"}!</h1><p className="text-sm text-inkMuted mt-1">Ready to make today's journey?</p></div>
          <div className="flex items-center gap-3"><Link to="/driver/notifications" aria-label="Notifications" className="w-10 h-10 rounded-xl bg-white border border-cardBorder flex items-center justify-center"><Bell size={17} /></Link><Link to="/driver/profile" className="w-10 h-10 rounded-xl bg-plum text-plumText flex items-center justify-center text-xs font-medium">{user?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2)}</Link></div>
        </header>

        <section className="grid lg:grid-cols-[1.45fr_0.75fr] gap-5">
          <div className="rounded-2xl overflow-hidden bg-plum text-plumText min-h-[285px] relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,.18),transparent_30%),linear-gradient(135deg,#241b2e,#5f3a56)]" />
            <div className="relative p-6 sm:p-7 h-full flex flex-col justify-between">
              <div><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage/20 text-sageBright text-[11px]"><span className="w-1.5 h-1.5 rounded-full bg-sageBright" /> {loading ? "Loading rides" : currentRide ? (upcomingRide ? "Upcoming ride" : currentRide.status) : "No posted rides"}</span><h2 className="font-heading text-2xl font-semibold mt-5">{currentRide ? `${currentRide.pickup.address} → ${currentRide.destination.address}` : "Your next trip starts here"}</h2><p className="text-plumMuted text-sm mt-1">{currentRide ? `${new Date(currentRide.departureTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · ${currentRide.seats - currentRide.seatsAvailable} seats booked` : "Post a ride to share your route with passengers."}</p></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8"><div><p className="text-xs text-plumMuted">Seats booked</p><p className="text-lg font-semibold mt-1">{currentRide ? `${currentRide.seats - currentRide.seatsAvailable} / ${currentRide.seats}` : "0 / 0"}</p></div><div><p className="text-xs text-plumMuted">Fare / seat</p><p className="text-lg font-semibold mt-1">{currentRide ? `₹${currentRide.fare}` : "--"}</p></div><div><p className="text-xs text-plumMuted">Seats available</p><p className="text-lg font-semibold mt-1">{currentRide?.seatsAvailable ?? 0}</p></div><div><p className="text-xs text-plumMuted">Status</p><p className="text-lg font-semibold mt-1 text-sageBright">{currentRide?.status || "Ready"}</p></div></div>
              <div className="flex flex-wrap gap-3 mt-6"><button onClick={() => navigate("/driver/rides")} className="px-4 py-2.5 rounded-lg bg-white text-plum text-xs font-medium">Manage rides</button><button onClick={() => navigate("/driver/requests")} className="px-4 py-2.5 rounded-lg bg-white/10 border border-white/15 text-xs font-medium">View bookings</button></div>
            </div>
          </div>

          <div className="bg-white border border-cardBorder rounded-2xl p-6 flex flex-col justify-between"><div><p className="text-xs text-inkMuted">Post a new ride</p><h2 className="font-heading text-xl font-semibold text-ink mt-2">Have empty seats?</h2><p className="text-sm text-inkMuted mt-2 leading-6">Share your route and let passengers find you.</p></div><button onClick={() => navigate("/driver/post-ride")} className="w-full mt-6 bg-rose text-plumText rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2"><Plus size={17} /> Post a ride</button></div>
        </section>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
          {[["Ride requests","4 pending",ClipboardIcon],["Today's earnings","₹480",IndianRupee],["Total rides","28 rides",CarFront],["Passengers","63 people",Users]].map(([label,value,Icon]) => <div key={label} className="bg-white border border-cardBorder rounded-2xl p-5"><div className="flex items-center justify-between"><p className="text-xs text-inkMuted">{label}</p><div className="w-9 h-9 rounded-xl bg-cream flex items-center justify-center"><Icon size={17} className="text-rose" /></div></div><p className="font-heading text-xl font-semibold mt-4">{value}</p></div>)}
            {[['Confirmed bookings','Open booking manager',Users],['Fare per passenger','Informational only',IndianRupee],['Published rides',loading ? '...' : `${rides.length} rides`,CarFront],['Available seats',loading ? '...' : activeRides.reduce((sum, ride) => sum + ride.seatsAvailable, 0),Users]].map(([label,value,Icon]) => <div key={label} className="bg-white border border-cardBorder rounded-2xl p-5"><div className="flex items-center justify-between"><p className="text-xs text-inkMuted">{label}</p><div className="w-9 h-9 rounded-xl bg-cream flex items-center justify-center"><Icon size={17} className="text-rose" /></div></div><p className="font-heading text-sm font-medium mt-4">{value}</p></div>)}
            {[["Ride requests","4 pending",ClipboardIcon],["Today's earnings","₹480",IndianRupee],["Total rides","28 rides",CarFront],["Passengers","63 people",Users]].map(([label,value,Icon]) => <div key={label} className="bg-white border border-cardBorder rounded-2xl p-5"><div className="flex items-center justify-between"><p className="text-xs text-inkMuted">{label}</p><div className="w-9 h-9 rounded-xl bg-cream flex items-center justify-center"><Icon size={17} className="text-rose" /></div></div><p className="font-heading text-xl font-semibold mt-4">{value}</p></div>)}
        </section>

        <section className="bg-white border border-cardBorder rounded-2xl p-5 sm:p-6 mt-5">
          <div className="flex items-center justify-between mb-5"><div><h2 className="font-heading text-lg font-semibold">Passenger bookings</h2><p className="text-xs text-inkMuted mt-1">Bookings are confirmed automatically after seat reservation</p></div><Link to="/driver/requests" className="text-xs text-rose flex items-center gap-1">View bookings <ArrowRight size={14} /></Link></div>
          <div className="space-y-2">
            {requests.map((r, index) => { const state = requestState[index]; return <div key={r.name} className="border border-cardBorder rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"><div className="w-10 h-10 rounded-full bg-plum text-plumText flex items-center justify-center text-xs shrink-0">{r.initials}</div><div className="flex-1"><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-inkMuted mt-1">{r.route} · {r.seats} seat · {r.time}</p></div>{state ? <span className={`text-xs font-medium px-3 py-2 rounded-lg ${state === "accepted" ? "bg-sage/15 text-sage" : "bg-coral/10 text-coral"}`}>{state === "accepted" ? "Request accepted" : "Request declined"}</span> : <div className="flex gap-2"><button onClick={() => decide(index,"rejected")} className="w-9 h-9 rounded-lg border border-cardBorder flex items-center justify-center text-inkMuted hover:text-coral"><X size={15} /></button><button onClick={() => decide(index,"accepted")} className="w-9 h-9 rounded-lg bg-sage/15 text-sage flex items-center justify-center"><Check size={15} /></button></div>}</div> })}
          </div>
        </section>

         <section className="grid lg:grid-cols-[1.4fr_1fr] gap-5 mt-5">
          <div className="bg-white border border-cardBorder rounded-2xl p-6"><div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-cream flex items-center justify-center"><Navigation size={18} className="text-rose" /></div><div><h3 className="font-heading text-sm font-semibold">Your route</h3><p className="text-xs text-inkMuted mt-1">Service area: {user?.serviceCity === "bengaluru" ? "Bengaluru" : "Nagpur"}</p></div></div><div className="h-72 sm:h-80"><RealMap city={user?.serviceCity} /></div></div>
          <div className="bg-plum text-plumText rounded-2xl p-6"><div className="flex items-center gap-3"><Clock3 size={18} className="text-sageBright" /><h3 className="font-heading text-sm font-semibold">Driver tips</h3></div><p className="text-sm text-plumMuted mt-4 leading-6">Keep your pickup point clear, confirm passenger requests before departure and update your ride status on time.</p><button className="text-xs text-sageBright mt-4 flex items-center gap-1">Learn more <ArrowRight size={13} /></button></div>
        </section>
      </div>
    </div>
  );
}

function ClipboardIcon(props) { return <span {...props}>▣</span>; }
