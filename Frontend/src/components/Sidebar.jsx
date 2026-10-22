import { NavLink } from "react-router-dom";
import LogoutButton from "./LogoutButton.jsx";
import MobileNavigation from "./MobileNavigation.jsx";
import useCommunicationCounts from "../hooks/useCommunicationCounts.js";
import {
  Home,
  Search,
  Car,
  MessageSquare,
  Bell,
  Wallet,
  LifeBuoy,
  User,
  Settings,
  Route,
  Repeat2,
} from "lucide-react";

const navItems = [
  { to: "/passenger", label: "Home", icon: Home },
  { to: "/find-ride", label: "Find Ride", icon: Search },
  { to: "/my-rides", label: "My Rides", icon: Car },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/safety", label: "Safety", icon: LifeBuoy },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/choose-role", label: "Switch mode", icon: Repeat2 },
];

export default function Sidebar() {
  const counts = useCommunicationCounts();
  return (
    <>
      <MobileNavigation title="RouteMate" subtitle="Share the ride. Save money." items={navItems} counts={counts} />
      <aside className="hidden md:flex w-[220px] shrink-0 bg-[#f2f2ee] min-h-screen px-3 py-5 lg:w-[255px]">

      {/* Sidebar Card */}
      <div
  className="w-full min-h-[calc(100vh-40px)] max-h-[760px] rounded-[9px] overflow-hidden text-[#eee8f0] px-2.5 py-4 flex flex-col shadow-sm bg-cover bg-center"
  style={{
    backgroundImage:
      "linear-gradient(to bottom, rgba(48, 36, 58, 0.1), rgba(48, 36, 58, 0.7)), url('/route-bg.png')",
  }}
>
        {/* Logo */}
        <div className="px-1.5">
          <div className="flex items-center gap-2">

            <div className="w-8 h-8 rounded-full bg-[#eee8ef] flex items-center justify-center shrink-0">
              <Route
                size={18}
                strokeWidth={2.5}
                className="text-[#392c43]"
              />
            </div>

            <span className="font-heading font-semibold text-[17px]">
              RouteMate
            </span>

          </div>

          <p className="text-[8px] leading-[11px] text-[#cfc4d3] ml-10 mt-0.5">
            Share the ride. Save money.
            <br />
            Build community.
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 mt-6">

          {navItems.map(({ to, label, icon: Icon }) => {
            const badge = label === "Messages" ? counts.messages : label === "Notifications" ? counts.notifications : 0;
            return <NavLink
              key={to}
              to={to}
              end={to === "/passenger"}
              className={({ isActive }) =>
                `flex items-center justify-between w-full px-2.5 py-[7px] rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-[#eee9ef] text-[#392c43]"
                    : "text-[#d0c5d4] hover:bg-white/10 hover:text-[#f5eff6]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-2.5 min-w-0">

                    <Icon
                      size={14}
                      strokeWidth={2}
                      className={
                        isActive
                          ? "text-[#493b50]"
                          : "text-[#cfc4d3]"
                      }
                    />

                    <span className="text-xs lg:text-[15px] font-medium truncate">
                      {label}
                    </span>

                  </span>

                  {/* Notification badges */}
                  {badge > 0 && (
                    <span className="w-[16px] h-[16px] rounded-full bg-[#cfc4d3] text-white flex items-center justify-center text-[8px] font-semibold shrink-0">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>;
          })}

        </nav>

        {/* Bottom section */}
        <div className="mt-auto pt-5">

          <div className="px-1 mb-3">
            <LogoutButton />
          </div>

          <p className="text-[7px] leading-[10px] text-[#bdb1c4] text-right pr-1">
            Better rides.
            <br />
            Greener tomorrow.
          </p>

        </div>

      </div>
      </aside>
    </>
  );
}