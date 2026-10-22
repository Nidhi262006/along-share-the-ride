import { useEffect, useState } from "react";
import { ArrowRight, CarFront, CheckCircle2, Route, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const roles = [
  { id: "passenger", title: "Passenger", icon: UserRound, text: "Find and book comfortable rides that match your route.", features: ["Find nearby rides", "Book seats", "Chat with drivers"] },
  { id: "driver", title: "Driver", icon: CarFront, text: "Share your empty seats, manage requests and earn on your route.", features: ["Post your rides", "Accept requests", "Track earnings"] },
];

export default function ChooseRole() {
  const navigate = useNavigate();
  const { user, chooseRole } = useAuth();
  const [role, setRole] = useState(user.role);
  const [serviceCity, setServiceCity] = useState(user.serviceCity || "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (user.role === "admin") navigate("/admin", { replace: true });
  }, [user.role, navigate]);

  const continueToApp = async () => {
    setError("");
    setPending(true);
    try {
      await chooseRole(role, serviceCity);
      navigate(role === "driver" ? "/driver" : "/passenger");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-rose/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-32 w-96 h-96 rounded-full bg-sage/10 blur-3xl" />
      <div className="relative w-full max-w-4xl">
        <div className="flex items-center gap-2 justify-center mb-12">
          <div className="w-10 h-10 rounded-xl bg-plum text-plumText flex items-center justify-center"><Route size={21} /></div>
          <span className="font-heading text-xl font-semibold">RouteMate</span>
        </div>
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-inkMuted">One account. Two ways to travel.</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold mt-3">How will you use RouteMate?</h1>
          <p className="text-sm text-inkMuted mt-3">Choose your role. You can switch between experiences later.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {roles.map(({ id, title, icon: Icon, text, features }) => {
            const active = role === id;
            return (
              <button key={id} onClick={() => setRole(id)} className={`text-left p-6 rounded-2xl border-2 transition-all ${active ? "border-rose bg-white shadow-lg shadow-rose/10" : "border-cardBorder bg-white/70 hover:border-inkMuted"}`}>
                <div className="flex items-start justify-between">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${active ? "bg-plum text-plumText" : "bg-cream text-inkMuted"}`}><Icon size={26} /></div>
                  {active && <CheckCircle2 size={23} className="text-rose" />}
                </div>
                <h2 className="font-heading text-xl font-semibold mt-6">{title}</h2>
                <p className="text-sm text-inkMuted mt-2 leading-6">{text}</p>
                <div className="mt-5 space-y-2">
                  {features.map((feature) => <div key={feature} className="flex items-center gap-2 text-xs text-ink"><span className="w-1.5 h-1.5 rounded-full bg-sage" />{feature}</div>)}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-6">
          <p className="text-sm font-medium text-center mb-3">Choose your service city</p>
          <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto">
            {[{ id: "bengaluru", label: "Bengaluru" }, { id: "nagpur", label: "Nagpur" }].map((city) => (
              <button
                key={city.id}
                type="button"
                aria-pressed={serviceCity === city.id}
                onClick={() => setServiceCity(city.id)}
                className={`p-3 rounded-xl border text-sm font-medium transition ${serviceCity === city.id ? "border-rose bg-white text-ink" : "border-cardBorder bg-white/70 text-inkMuted hover:border-inkMuted"}`}
              >
                {city.label}
              </button>
            ))}
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-coral text-center mt-5">{error}</p>}
        <button onClick={continueToApp} disabled={pending || !serviceCity} className="mx-auto mt-8 flex items-center justify-center gap-2 rounded-xl bg-plum text-plumText px-7 py-3.5 text-sm font-medium hover:bg-rose transition disabled:opacity-60">
          {pending ? "Saving..." : `Continue as ${role === "driver" ? "Driver" : "Passenger"}`}<ArrowRight size={17} />
        </button>
      </div>
    </div>
  );
}
