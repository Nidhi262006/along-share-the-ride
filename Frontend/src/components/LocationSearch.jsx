import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { getCurrentLocation, searchLocation } from "../services/locationService";

export default function LocationSearch({ onLocationSelect, city }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    if (!query.trim()) {
      setError("Enter a location");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const location = await searchLocation(city ? `${query}, ${city}, India` : query);

      onLocationSelect(location);

      setQuery(location.name);
    } catch (error) {
      console.error(error);
      setError("Location not found. Try a nearby landmark or enter a more specific address.");
    } finally {
      setLoading(false);
    }
  }

  async function useCurrentLocation() {
    try {
      setLoading(true);
      setError("");
      const location = await getCurrentLocation(city);
      onLocationSelect(location);
      setQuery(location.name);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      handleSearch();
    }
  }

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search location..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-plumMuted"
        />

        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-rose text-plumText text-xs font-medium"
        >
          {loading ? "..." : "Search"}
        </button>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={loading}
          title="Use current GPS location"
          aria-label="Use current GPS location"
          className="shrink-0 p-2 rounded-lg border border-cardBorder text-inkMuted hover:text-ink disabled:opacity-60"
        >
          <LocateFixed size={16} />
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-2">
          {error}
        </p>
      )}
    </div>
  );
}