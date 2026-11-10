import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const cities = [
  { id: "bengaluru", label: "Bengaluru" },
  { id: "nagpur", label: "Nagpur" },
];

export default function ModeSwitch({ onDone }) {
  const navigate = useNavigate();
  const { user, chooseRole } = useAuth();
  const [role, setRole] = useState(user?.role === "driver" ? "driver" : "passenger");
  const [serviceCity, setServiceCity] = useState(user?.serviceCity || "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save(event) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const updated = await chooseRole(role, serviceCity);
      navigate(updated.role === "driver" ? "/driver" : "/passenger");
      onDone?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8a8498]">Travel as</p>
      <div className="grid grid-cols-2 gap-2">
        {["passenger", "driver"].map((item) => (
          <button key={item} type="button" onClick={() => setRole(item)} className={`rounded-xl px-3 py-2 text-sm capitalize ${role === item ? "bg-[#2a2438] text-white" : "bg-[#f4f0f8] text-[#4d4560]"}`}>{item}</button>
        ))}
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8a8498]">Service city</p>
      <div className="grid grid-cols-2 gap-2">
        {cities.map((city) => (
          <button key={city.id} type="button" onClick={() => setServiceCity(city.id)} className={`rounded-xl px-3 py-2 text-sm ${serviceCity === city.id ? "bg-[#2a2438] text-white" : "bg-[#f4f0f8] text-[#4d4560]"}`}>{city.label}</button>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-[#c45b52]">{error}</p>}
      <button disabled={pending || !serviceCity} className="along-button w-full rounded-xl py-2.5 text-xs">{pending ? "Saving..." : "Save and continue"}</button>
    </form>
  );
}
