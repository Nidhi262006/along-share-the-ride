const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

export async function getRoute(start, end) {
  const coordinates = `${start[1]},${start[0]};${end[1]},${end[0]}`;

  const response = await fetch(
    `${OSRM_URL}/${coordinates}?overview=full&geometries=geojson`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch route");
  }

  const data = await response.json();

  if (data.code !== "Ok" || !data.routes.length) {
    throw new Error("No route found");
  }

  const route = data.routes[0];

  return {
    coordinates: route.geometry.coordinates.map(
      ([longitude, latitude]) => [latitude, longitude]
    ),
    distance: route.distance,
    duration: route.duration,
  };
}