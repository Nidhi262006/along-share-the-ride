import { NavLink } from "react-router-dom";
import { Activity, CarFront, ClipboardCheck, LayoutDashboard, Users } from "lucide-react";
import LogoutButton from "./LogoutButton.jsx";
import MobileNavigation from "./MobileNavigation.jsx";

const items = [
  ["/admin", "Overview", LayoutDashboard],
  ["/admin/users", "Users", Users],
  ["/admin/drivers", "Verification", ClipboardCheck],
  ["/admin/rides", "Rides", CarFront],
  ["/admin/reports", "Reports", Activity],
];

export default function AdminSidebar() {
  const navigationItems = items.map(([to, label, icon]) => ({ to, label, icon, end: to === "/admin" }));
  return <>
    <MobileNavigation title="along Admin" subtitle="Administration" items={navigationItems} />
    <aside className="hidden md:flex w-[220px] shrink-0 bg-[#f2f2ee] min-h-screen px-3 py-5 lg:w-[255px]">
    <div className="w-full min-h-[calc(100vh-40px)] rounded-[9px] text-[#eee8f0] px-3 py-5 flex flex-col shadow-sm bg-[#392c43]">
      <p className="font-heading font-semibold text-lg px-2">along Admin</p>
      <nav className="flex flex-col gap-1 mt-7">
        {items.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === "/admin"} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-full text-sm ${isActive ? "bg-[#eee9ef] text-[#392c43]" : "text-[#d0c5d4] hover:bg-white/10"}`}><Icon size={16} />{label}</NavLink>)}
      </nav>
      <div className="mt-auto"><LogoutButton /></div>
    </div>
    </aside>
  </>;
}