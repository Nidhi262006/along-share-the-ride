import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ===============================
// DEMO LOCATIONS
// ===============================

const cityLocations = {
  bengaluru: {
    center: [12.9716, 77.5946],
    pickup: [12.9752, 77.6011],
    destination: [12.9344, 77.6113],
  },
  nagpur: {
    center: [21.1325, 79.082],
    pickup: [21.1458, 79.0882],
    destination: [21.1635, 79.11],
  },
};

// ===============================
// CUSTOM MARKERS
// ===============================

const currentIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 18px;
      height: 18px;
      background: #6366f1;
      border: 4px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    "></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const pickupIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #4f46e5;
      border: 4px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    ">
      <div style="
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 3px;
        left: 3px;
      "></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

const destinationIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #7c3aed;
      border: 4px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    ">
      <div style="
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 3px;
        left: 3px;
      "></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

// ===============================
// MAP CONTROLS
// ===============================

function MapControls({ currentLocation }) {
  const map = useMap();

  function goToCurrentLocation() {
    map.flyTo(currentLocation, 14, {
      duration: 1,
    });
  }

  return (
    <div
      style={{
        position: "absolute",
        right: "18px",
        bottom: "90px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <button
        onClick={() => map.zoomIn()}
        style={{
          width: "42px",
          height: "42px",
          border: "none",
          borderRadius: "12px",
          background: "white",
          color: "#374151",
          fontSize: "22px",
          fontWeight: "600",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        }}
      >
        +
      </button>

      <button
        onClick={() => map.zoomOut()}
        style={{
          width: "42px",
          height: "42px",
          border: "none",
          borderRadius: "12px",
          background: "white",
          color: "#374151",
          fontSize: "22px",
          fontWeight: "600",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        }}
      >
        −
      </button>

      <button
        onClick={goToCurrentLocation}
        title="Service area center"
        style={{
          width: "42px",
          height: "42px",
          border: "none",
          borderRadius: "12px",
          background: "white",
          color: "#4f46e5",
          fontSize: "18px",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        }}
      >
        ●
      </button>
    </div>
  );
}

// ===============================
// ROUTING
// ===============================

function RealRoute({
  pickup,
  destination,
  setRoute,
  setDistance,
  setDuration,
  setLoading,
  setError,
}) {
  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      try {
        setLoading(true);
        setError("");

        // OSRM expects longitude,latitude
        const coordinates = [pickup, destination]
          .map(
            ([latitude, longitude]) =>
              `${longitude},${latitude}`
          )
          .join(";");

        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${coordinates}` +
          `?overview=full&geometries=geojson`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Route request failed");
        }

        const data = await response.json();

        if (
          data.code !== "Ok" ||
          !data.routes ||
          data.routes.length === 0
        ) {
          throw new Error("No route found");
        }

        const route = data.routes[0];

        // Convert OSRM [longitude, latitude]
        // to Leaflet [latitude, longitude]
        const leafletCoordinates =
          route.geometry.coordinates.map(
            ([longitude, latitude]) => [
              latitude,
              longitude,
            ]
          );

        if (cancelled) return;
        setRoute(leafletCoordinates);
        setDistance(route.distance);
        setDuration(route.duration);
      } catch (error) {
        if (cancelled) return;
        console.error("Routing error:", error);
        setRoute([]);
        setDistance(null);
        setDuration(null);
        setError("Road route unavailable. No distance estimate is shown; use the location search fields to adjust your endpoints.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [
    pickup,
    destination,
    setRoute,
    setDistance,
    setDuration,
    setLoading,
    setError,
  ]);

  return null;
}

// ===============================
// MAP VIEW
// ===============================

function MapViewUpdater({
  pickup,
  destination,
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds([
      pickup,
      destination,
    ]);

    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 14,
    });
  }, [map, pickup, destination]);

  return null;
}

// ===============================
// MAIN MAP
// ===============================

export default function RealMap({
  city = "nagpur",
  pickupLocation,
  destinationLocation,
}) {
  /*
    If the user has not selected locations yet,
    use our demo locations.
  */

  const locations = cityLocations[city] || cityLocations.nagpur;
  const pickup = pickupLocation
    ? [
        pickupLocation.latitude,
        pickupLocation.longitude,
      ]
    : locations.pickup;

  const destination = destinationLocation
    ? [
        destinationLocation.latitude,
        destinationLocation.longitude,
      ]
    : locations.destination;

  const currentLocation = locations.center;

  const [route, setRoute] = useState([]);

  const [distance, setDistance] = useState(null);

  const [duration, setDuration] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "420px",
        borderRadius: "24px",
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={pickup}
        zoom={13}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        {/* =====================
            MAP TILES
        ====================== */}

        <TileLayer
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* =====================
            CURRENT LOCATION
        ====================== */}

        <Marker
          position={currentLocation}
          icon={currentIcon}
        >
          <Popup>
            Service area center
          </Popup>
        </Marker>

        {/* =====================
            PICKUP
        ====================== */}

        <Marker
          position={pickup}
          icon={pickupIcon}
        >
          <Popup>
            {pickupLocation
              ? pickupLocation.name
              : "Pickup location"}
          </Popup>
        </Marker>

        {/* =====================
            DESTINATION
        ====================== */}

        <Marker
          position={destination}
          icon={destinationIcon}
        >
          <Popup>
            {destinationLocation
              ? destinationLocation.name
              : "Destination"}
          </Popup>
        </Marker>

        {/* =====================
            REAL ROAD ROUTE
        ====================== */}

        {route.length > 0 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: "#6366f1",
              weight: 5,
              opacity: 0.9,
            }}
          />
        )}

        {/* =====================
            ROUTE API
        ====================== */}

        <RealRoute
          pickup={pickup}
          destination={destination}
          setRoute={setRoute}
          setDistance={setDistance}
          setDuration={setDuration}
          setLoading={setLoading}
          setError={setError}
        />

        {/* =====================
            AUTO ZOOM
        ====================== */}

        <MapViewUpdater
          pickup={pickup}
          destination={destination}
        />

        {/* =====================
            CONTROLS
        ====================== */}

        <MapControls
          currentLocation={currentLocation}
        />
      </MapContainer>

      {/* =========================
          ROUTE INFORMATION
      ========================== */}

      <div
        style={{
          position: "absolute",
          left: "18px",
          right: "18px",
          bottom: "18px",
          zIndex: 1000,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(10px)",
          borderRadius: "18px",
          padding: "14px 18px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "15px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "12px",
                color: "#6b7280",
                marginBottom: "4px",
              }}
            >
              Route
            </div>

            <div
              style={{
                fontSize: "15px",
                fontWeight: "600",
                color: "#111827",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {pickupLocation
                ? pickupLocation.name.split(",")[0]
                : "Pickup"}{" "}
              →{" "}
              {destinationLocation
                ? destinationLocation.name.split(",")[0]
                : "Destination"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              whiteSpace: "nowrap",
              fontSize: "14px",
              fontWeight: "600",
              color: "#4f46e5",
            }}
          >
            <span>
              {distance
                ? `${(distance / 1000).toFixed(1)} km`
                : loading
                ? "Calculating..."
                : "--"}
            </span>

            <span style={{ color: "#9ca3af" }}>
              •
            </span>

            <span>
              {duration
                ? `${Math.round(duration / 60)} min`
                : loading
                ? "Calculating..."
                : "--"}
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "#dc2626",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}