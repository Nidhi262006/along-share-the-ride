import { useState } from "react";
import { ChevronRight } from "lucide-react";

const rows = [
  { label: "Account settings" },
  { label: "Privacy and security" },
  { label: "Payment methods" },
  { label: "Language", value: "English" },
  { label: "Appearance", value: "System" },
  { label: "Become a driver" },
];

export default function Settings() {
  const [notifOn, setNotifOn] = useState(true);

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-semibold text-ink mb-6">Settings</h1>

      <div className="flex items-center justify-between bg-card border border-cardBorder rounded-xl px-4 py-3.5 mb-2">
        <span className="text-sm text-ink">Push notifications</span>
        <button
          onClick={() => setNotifOn(!notifOn)}
          className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${
            notifOn ? "bg-sage justify-end" : "bg-cardBorder justify-start"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-card" />
        </button>
      </div>

      <div className="flex flex-col gap-1 mt-4">
        {rows.map((row) => (
          <button
            key={row.label}
            className="flex items-center justify-between bg-card border border-cardBorder rounded-xl px-4 py-3.5 hover:border-inkMuted transition-colors"
          >
            <span className="text-sm text-ink">{row.label}</span>
            <span className="flex items-center gap-2 text-xs text-inkMuted">
              {row.value}
              <ChevronRight size={16} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
