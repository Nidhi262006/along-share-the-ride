import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight, Leaf, Menu, Route, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import useCommunicationCounts from "../../hooks/useCommunicationCounts.js";
import LogoutButton from "../LogoutButton.jsx";
import ModeSwitch from "./ModeSwitch.jsx";

function linksFor(role) {
  if (role === "admin") {
    return [
      { to: "/admin", label: "Overview", end: true },
      { to: "/admin/users", label: "Users" },
      { to: "/admin/drivers", label: "Verification" },
      { to: "/admin/rides", label: "Rides" },
      { to: "/admin/reports", label: "Reports" },
    ];
  }
  if (role === "driver") {
    return [
      { to: "/driver", label: "Dashboard", end: true },
      { to: "/driver/post-ride", label: "Post a ride" },
      { to: "/driver/requests", label: "Bookings" },
      { to: "/driver/messages", label: "Messages", badge: "messages" },
    ];
  }
  return [
    { to: "/find-ride", label: "Find a ride" },
    { to: "/my-rides", label: "My rides" },
    { to: "/messages", label: "Messages", badge: "messages" },
  ];
}

function moreLinksFor(role) {
  if (role === "admin") return [];
  if (role === "driver") {
    return [
      ["/driver/rides", "My rides"],
      ["/driver/passengers", "Passengers"],
      ["/driver/notifications", "Notifications"],
      ["/driver/earnings", "Earnings"],
      ["/driver/verification", "Verification"],
      ["/driver/profile", "Profile"],
      ["/driver/settings", "Settings"],
    ];
  }
  return [
    ["/passenger", "Home"],
    ["/notifications", "Notifications"],
    ["/wallet", "Wallet"],
    ["/safety", "Safety"],
    ["/profile", "Profile"],
    ["/settings", "Settings"],
  ];
}

export default function AppHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const counts = useCommunicationCounts();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const links = linksFor(user?.role);
  const moreLinks = moreLinksFor(user?.role);
  const initials = user?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "RM";
  const howTo = user?.role === "driver" ? "/driver/post-ride" : user?.role === "admin" ? "/admin" : "/find-ride";
  const why = user?.role === "driver" ? "/driver/verification" : user?.role === "admin" ? "/admin/reports" : "/safety";

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#f3eef6] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to={user?.role === "admin" ? "/admin" : user?.role === "driver" ? "/driver" : "/passenger"} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2a2438] text-white"><Route size={18} /></span>
          <span className="font-display text-[1.65rem] font-semibold leading-none tracking-[-0.04em] text-[#241c33]">RouteMate</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-6 lg:flex" aria-label="Primary">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `relative text-sm ${isActive ? "text-[#241c33]" : "text-[#6f687c] hover:text-[#241c33]"}`}>
              {({ isActive }) => (
                <>
                  {link.label}
                  {link.badge && counts[link.badge] > 0 && <span className="ml-1 rounded-full bg-[#ece6f4] px-1.5 text-[10px]">{counts[link.badge]}</span>}
                  {isActive && <span className="absolute -bottom-[26px] left-0 right-0 h-0.5 bg-[#6d4ea3]" />}
                </>
              )}
            </NavLink>
          ))}
          <NavLink to={why} className="text-sm text-[#6f687c] hover:text-[#241c33]">Why we share?</NavLink>
          <NavLink to={howTo} className="inline-flex items-center gap-2 rounded-full border border-[#e6e0ec] px-3.5 py-2 text-sm text-[#241c33] hover:bg-[#f7f4fb]">
            How it works <ArrowRight size={14} />
          </NavLink>
        </nav>

        <div className="ml-auto hidden items-center gap-4 xl:flex">
          <p className="flex items-center gap-2 text-sm text-[#6f687c]"><Leaf size={15} /> Less traffic. More connection.</p>
        </div>

        <div className="relative ml-auto xl:ml-4">
          <button type="button" onClick={() => setAccountOpen((current) => !current)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f0f8] text-xs font-semibold text-[#241c33]" aria-expanded={accountOpen} aria-label="Account menu">
            {initials}
          </button>
          {accountOpen && (
            <div className="absolute right-0 top-12 z-50 w-72 rounded-3xl border border-[#ece7f1] bg-white p-4 shadow-xl">
              <p className="text-sm font-medium text-[#241c33]">{user?.name}</p>
              <p className="mt-0.5 text-xs capitalize text-[#8a8498]">{user?.role}{user?.serviceCity ? ` · ${user.serviceCity}` : ""}</p>
              {user?.role !== "admin" && <div className="mt-4 border-t border-[#f0ebf4] pt-4"><ModeSwitch onDone={() => setAccountOpen(false)} /></div>}
              <div className="mt-3 border-t border-[#f0ebf4] pt-2">
                <LogoutButton tone="light" />
              </div>
            </div>
          )}
        </div>

        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#241c33] lg:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((current) => !current)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-[#f3eef6] bg-white px-4 py-4 lg:hidden" aria-label="Mobile">
          <div className="flex flex-col gap-1">
            {[...links, ...moreLinks.map(([to, label]) => ({ to, label }))].map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `rounded-xl px-3 py-3 text-sm ${isActive ? "bg-[#f4f0f8] text-[#241c33]" : "text-[#5c5468]"}`}>
                {link.label}
              </NavLink>
            ))}
            <NavLink to={why} className="rounded-xl px-3 py-3 text-sm text-[#5c5468]">Why we share?</NavLink>
          </div>
        </nav>
      )}
    </header>
  );
}
