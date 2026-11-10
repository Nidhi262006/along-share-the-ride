import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { Menu, Route, X } from "lucide-react";
import LogoutButton from "./LogoutButton.jsx";

export default function MobileNavigation({ title = "along.", subtitle, items, counts = {} }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const closeOnDesktop = () => {
      if (window.matchMedia("(min-width: 768px)").matches) setOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktop);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-plum px-4 text-plumText shadow-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eee8ef] text-[#392c43]">
            <Route size={19} strokeWidth={2.5} />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-heading text-base font-semibold">{title}</span>
            {subtitle && <span className="block truncate text-[10px] text-plumMuted">{subtitle}</span>}
          </span>
        </div>
        <button
          ref={triggerRef}
          type="button"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation-drawer"
          onClick={() => setOpen((current) => !current)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-plumText hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {open ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
        </button>
      </header>

      {open && createPortal(
        <div className="fixed inset-0 z-[2000] md:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 z-0 h-full w-full bg-black/50"
          />
          <nav
            id="mobile-navigation-drawer"
            aria-label={`${title} navigation`}
            aria-modal="true"
            role="dialog"
            className="absolute inset-y-0 left-0 z-10 flex w-[min(20rem,88vw)] flex-col overflow-y-auto bg-plum px-4 pb-5 pt-4 text-plumText shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between border-b border-plumBorder pb-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eee8ef] text-[#392c43]">
                  <Route size={19} strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-heading text-base font-semibold">{title}</p>
                  {subtitle && <p className="truncate text-[10px] text-plumMuted">{subtitle}</p>}
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                aria-label="Close navigation menu"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-plumText hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              {items.map(({ to, label, icon: Icon, end }) => {
                const badge = label === "Messages" ? counts.messages : label === "Notifications" ? counts.notifications : 0;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end ?? to === "/passenger"}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive ? "bg-[#eee9ef] text-[#392c43]" : "text-[#d0c5d4] hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon size={18} className="shrink-0" />
                      <span className="truncate">{label}</span>
                    </span>
                    {badge > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#cfc4d3] px-1 text-[10px] font-semibold text-[#392c43]">{badge}</span>}
                  </NavLink>
                );
              })}
            </div>

            <div className="mt-auto border-t border-plumBorder pt-4">
              <LogoutButton />
            </div>
          </nav>
        </div>,
        document.body
      )}
    </div>
  );
}
