import { useEffect, useRef, useState } from "react";
import { LifeBuoy, Phone, ShieldCheck, X } from "lucide-react";

const CONTACTS_KEY = "routemate-emergency-contacts";
const HOLD_SECONDS = 3;

function loadContacts() {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function SosButton() {
  const [stage, setStage] = useState("idle");
  const [count, setCount] = useState(HOLD_SECONDS);
  const [location, setLocation] = useState(null);
  const timerRef = useRef(null);
  const contacts = loadContacts();

  useEffect(() => () => clearInterval(timerRef.current), []);

  const sendAlert = () => {
    setStage("sent");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation(null),
        { timeout: 5000 }
      );
    }
  };

  const startAlert = () => {
    setStage("counting");
    setCount(HOLD_SECONDS);
    timerRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          sendAlert();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const cancelAlert = () => {
    clearInterval(timerRef.current);
    setStage("idle");
  };

  const reset = () => {
    setStage("idle");
    setLocation(null);
  };

  return (
    <>
      <button
        onClick={startAlert}
        aria-label="Send SOS alert"
        className="fixed bottom-6 right-4 sm:right-6 z-40 w-14 h-14 rounded-full bg-coral text-white shadow-lg flex items-center justify-center hover:brightness-95 transition"
      >
        <LifeBuoy size={22} />
      </button>

      {stage !== "idle" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-7">
            {stage === "counting" && (
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-coral/10 text-coral flex items-center justify-center text-3xl font-semibold">
                  {count}
                </div>
                <p className="text-sm text-inkMuted mt-4">Sending an SOS alert to your emergency contacts in {count}s</p>
                <button onClick={cancelAlert} className="w-full mt-5 border border-cardBorder rounded-xl py-3 text-sm font-medium">
                  Cancel
                </button>
              </div>
            )}

            {stage === "sent" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sage">
                    <ShieldCheck size={20} />
                    <p className="text-sm font-medium text-ink">Alert sent</p>
                  </div>
                  <button onClick={reset} className="text-inkMuted"><X size={18} /></button>
                </div>

                {contacts.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    <p className="text-xs text-inkMuted">Notified</p>
                    {contacts.map((c) => (
                      <div key={c.phone} className="flex items-center gap-2 text-sm text-ink">
                        <Phone size={14} className="text-inkMuted" /> {c.name} · {c.phone}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-inkMuted mb-4">
                    No emergency contacts added yet — add one in Safety settings so alerts reach someone.
                  </p>
                )}

                <p className="text-xs text-inkMuted">
                  {location
                    ? `Live location shared: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                    : "Location could not be shared — check location permissions."}
                </p>

                <button onClick={reset} className="w-full mt-5 bg-rose text-plumText rounded-xl py-3 text-sm font-medium">
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}