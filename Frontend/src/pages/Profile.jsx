import { useState } from "react";
import {
  ChevronRight,
  Car,
  Bell,
  HelpCircle,
  Settings as SettingsIcon,
  BadgeCheck,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { currentUser } from "../data/mockData.js";
import { useAuth } from "../context/AuthContext.jsx";

const menuItems = [
  { label: "My rides", icon: Car },
  { label: "Notifications", icon: Bell },
  { label: "Help and support", icon: HelpCircle },
  { label: "Settings", icon: SettingsIcon },
];

export default function Profile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    setLogoutError("");
    try {
      await logout();
      navigate("/auth", { replace: true });
    } catch {
      setLogoutError("Unable to sign out. Check your connection and try again.");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-semibold text-ink mb-6">My profile</h1>

      <div className="bg-card border border-cardBorder rounded-xl p-6 flex flex-col items-center text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-sage/15 flex items-center justify-center text-xl font-medium text-sage mb-3">
          {currentUser.avatarInitials}
        </div>
        <p className="font-heading text-lg font-semibold text-ink">{currentUser.name}</p>
        <p className="text-sm text-inkMuted">{currentUser.role}</p>
        <p className="text-sm text-inkMuted">{currentUser.college}</p>

        <div className="grid grid-cols-3 gap-6 mt-5 w-full max-w-xs">
          <div>
            <p className="font-heading text-lg font-semibold text-ink">{currentUser.stats.rides}</p>
            <p className="text-xs text-inkMuted">Rides</p>
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-ink">{currentUser.stats.rating}</p>
            <p className="text-xs text-inkMuted">Rating</p>
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-ink">{currentUser.stats.onTime}%</p>
            <p className="text-xs text-inkMuted">On-time</p>
          </div>
        </div>

        {currentUser.verified && (
          <span className="flex items-center gap-1 text-xs text-sage bg-sage/12 px-2.5 py-1 rounded-full mt-4">
            <BadgeCheck size={13} /> Verified account
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 mb-6">
        {menuItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className="flex items-center justify-between bg-card border border-cardBorder rounded-xl px-4 py-3.5 hover:border-inkMuted transition-colors"
          >
            <span className="flex items-center gap-3 text-sm text-ink">
              <Icon size={16} className="text-inkMuted" />
              {label}
            </span>
            <ChevronRight size={16} className="text-inkMuted" />
          </button>
        ))}
      </div>

      <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-sm text-inkMuted border border-cardBorder rounded-xl py-3 hover:text-ink transition-colors">
        <LogOut size={16} /> Log out
      </button>
      {logoutError && <p role="alert" className="text-xs text-coral text-center mt-2">{logoutError}</p>}
    </div>
  );
}
