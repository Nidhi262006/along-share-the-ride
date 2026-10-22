// Search for a place and return its coordinates
export async function searchLocation(place) {
  if (!place.trim()) {
    throw new Error("Please enter a location");
  }

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(place)}` +
    `&format=json` +
    `&limit=1`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Location search failed");
  }

  const data = await response.json();

  if (data.length === 0) {
    throw new Error("Location not found");
  }

  const location = data[0];

  return {
    name: location.display_name,
    latitude: Number(location.lat),
    longitude: Number(location.lon),
  };
}

export async function reverseSearchLocation(latitude, longitude) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&format=json`
  );

  if (!response.ok) {
    throw new Error("Address lookup failed");
  }

  const location = await response.json();
  if (!location.display_name) {
    throw new Error("Address not found");
  }

  return {
    name: location.display_name,
    latitude: Number(location.lat),
    longitude: Number(location.lon),
  };
}

export async function getCurrentLocation(city) {
  if (!navigator.geolocation) {
    throw new Error("GPS is unavailable. Search for a place or enter an address manually.");
  }

  let position;
  try {
    position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });
  } catch (error) {
    if (error.code === 1) {
      throw new Error("Location access was denied. Search for a place or enter an address manually.");
    }
    throw new Error("GPS could not determine your location. Search for a place or enter an address manually.");
  }

  const { latitude, longitude } = position.coords;
  let location;
  try {
    location = await reverseSearchLocation(latitude, longitude);
  } catch {
    location = {
      name: `GPS location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
      latitude,
      longitude,
    };
  }

  return {
    ...location,
    name: city && !new RegExp(city === "Bengaluru" ? "bengaluru|bangalore" : city, "i").test(location.name)
      ? `${location.name}, ${city}`
      : location.name,
  };
}