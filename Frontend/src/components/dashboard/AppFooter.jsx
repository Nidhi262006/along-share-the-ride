import { Link } from "react-router-dom";
import { Route } from "lucide-react";

export default function AppFooter() {
  return (
    <footer className="mt-auto border-t border-[#f0ebf4] px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-[#6f687c]">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2a2438] text-white"><Route size={15} /></span>
          <span className="font-display text-xl font-semibold tracking-[-0.04em] text-[#241c33]">RouteMate</span>
          <span className="hidden sm:inline">Good company. Wherever you&apos;re going.</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-[#6f687c]">
          <Link to="/find-ride" className="hover:text-[#241c33]">Find a ride</Link>
          <Link to="/safety" className="hover:text-[#241c33]">Why we share</Link>
          <span>© {new Date().getFullYear()} RouteMate</span>
        </div>
      </div>
    </footer>
  );
}
