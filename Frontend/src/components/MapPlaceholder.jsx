import { MapPin, Navigation } from "lucide-react";

export default function MapPlaceholder() {
  return (
    <div className="relative w-full h-64 rounded-xl bg-card border border-cardBorder overflow-hidden">
      <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#E8E0D2" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 260" preserveAspectRatio="none">
        <path
          d="M 60 60 C 140 90, 160 130, 210 140 S 320 190, 340 210"
          fill="none"
          stroke="#5F3A56"
          strokeWidth="2.5"
          strokeDasharray="6 6"
        />
      </svg>

      <div className="absolute" style={{ left: "12%", top: "20%" }}>
        <MapPin size={20} className="text-sage fill-sage/25" />
        <span className="text-[11px] text-ink bg-card border border-cardBorder rounded px-1.5 py-0.5 mt-1 inline-block shadow-sm">
          College
        </span>
      </div>
      <div className="absolute" style={{ left: "82%", top: "76%" }}>
        <MapPin size={20} className="text-rose fill-rose/20" />
        <span className="text-[11px] text-ink bg-card border border-cardBorder rounded px-1.5 py-0.5 mt-1 inline-block shadow-sm -translate-x-full">
          Nagpur
        </span>
      </div>

      <div className="absolute bottom-3 left-3 bg-plum text-plumText rounded-lg px-3 py-2 flex items-center gap-2">
        <Navigation size={14} className="text-sageBright" />
        <span className="text-xs">2.3 km · 12 min</span>
      </div>
    </div>
  );
}
