const ROUTING_URL = process.env.ROUTING_SERVICE_URL || "https://router.project-osrm.org/route/v1/driving";
const ROUTING_TIMEOUT_MS = 5000;

function configuredNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const MAX_DETOUR_SECONDS = configuredNumber("RIDE_MATCH_MAX_DETOUR_MINUTES", 10) * 60;
const MAX_ROUTE_DEVIATION_METERS = configuredNumber("RIDE_MATCH_MAX_ROUTE_DEVIATION_METERS", 2000);

async function getRoadRoute(points, includeGeometry) {
  const coordinates = points.map(({ lat, lng }) => `${lng},${lat}`).join(";");
  const url = `${ROUTING_URL}/${coordinates}?overview=${includeGeometry ? "full" : "false"}&geometries=geojson`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Road routing service returned an error");
    const data = await response.json();
    const route = data.code === "Ok" ? data.routes?.[0] : null;
    if (!route || !Number.isFinite(route.duration) || !Number.isFinite(route.distance)) {
      throw new Error("Road routing service returned no usable route");
    }
    return route;
  } finally {
    clearTimeout(timeout);
  }
}

async function validateRideWaypoints(points) {
  if (!Array.isArray(points) || points.length < 2 || points.length > 22) throw new Error("Invalid ride waypoints");
  await getRoadRoute(points, false);
  return true;
}

function haversineMeters(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDifference = radians(second[1] - first[1]);
  const longitudeDifference = radians(second[0] - first[0]);
  const latitude = radians(first[1]);
  const nextLatitude = radians(second[1]);
  const value = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(latitude) * Math.cos(nextLatitude) * Math.sin(longitudeDifference / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function pointPositionOnRoute(point, coordinates) {
  let distanceAlongRoute = 0;
  let closest = null;
  const latitudeScale = Math.cos(point[1] * Math.PI / 180);
  const project = ([longitude, latitude]) => [
    longitude * Math.PI / 180 * 6371000 * latitudeScale,
    latitude * Math.PI / 180 * 6371000,
  ];
  const projectedPoint = project(point);

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const projectedStart = project(start);
    const projectedEnd = project(end);
    const segmentX = projectedEnd[0] - projectedStart[0];
    const segmentY = projectedEnd[1] - projectedStart[1];
    const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;
    const fraction = segmentLengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
      ((projectedPoint[0] - projectedStart[0]) * segmentX
        + (projectedPoint[1] - projectedStart[1]) * segmentY) / segmentLengthSquared));
    const projectedDistance = Math.hypot(
      projectedPoint[0] - (projectedStart[0] + fraction * segmentX),
      projectedPoint[1] - (projectedStart[1] + fraction * segmentY)
    );
    const segmentLength = haversineMeters(start, end);

    if (!closest || projectedDistance < closest.distanceMeters) {
      closest = {
        distanceMeters: projectedDistance,
        distanceAlongMeters: distanceAlongRoute + segmentLength * fraction,
      };
    }
    distanceAlongRoute += segmentLength;
  }

  return closest;
}

async function mapWithConcurrency(values, concurrency, callback) {
  const results = new Array(values.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(values[index]);
    }
  }));
  return results;
}

function compareMatches(first, second, sort) {
  const routeRank = first.routeMatch.routeDeviationMeters - second.routeMatch.routeDeviationMeters
    || first.routeMatch.detourSeconds - second.routeMatch.detourSeconds
    || first.routeMatch.pickupConvenienceMeters - second.routeMatch.pickupConvenienceMeters;
  if (routeRank) return routeRank;
  if (sort === "fare") return first.fare - second.fare || first.departureTime - second.departureTime;
  if (sort === "availability") return second.seatsAvailable - first.seatsAvailable || first.departureTime - second.departureTime;
  return first.departureTime - second.departureTime;
}

async function matchRides(rides, request, sort) {
  let successfulRouteRequests = 0;
  let failedRouteRequests = 0;
  const results = await mapWithConcurrency(rides, 3, async (ride) => {
    const ridePickup = { lat: ride.pickup.lat, lng: ride.pickup.lng };
    const rideDestination = { lat: ride.destination.lat, lng: ride.destination.lng };
    const orderedStops = [...(ride.stops || [])].sort((first, second) => first.order - second.order);
    const rideWaypoints = [ridePickup, ...orderedStops.map(({ lat, lng }) => ({ lat, lng })), rideDestination];

    try {
      const directRoute = await getRoadRoute(rideWaypoints, true);
      successfulRouteRequests += 1;
      const coordinates = directRoute.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        failedRouteRequests += 1;
        return null;
      }
      const pickupPosition = pointPositionOnRoute([request.pickup.lng, request.pickup.lat], coordinates);
      const destinationPosition = pointPositionOnRoute([request.destination.lng, request.destination.lat], coordinates);
      const stopPositions = orderedStops.map((stop) => pointPositionOnRoute([stop.lng, stop.lat], coordinates));
      const allStopsHavePositions = stopPositions.every(Boolean);
      const stopsAreOrdered = allStopsHavePositions && stopPositions.every((position, index) => index === 0
        || position.distanceAlongMeters > stopPositions[index - 1].distanceAlongMeters);
      if (!pickupPosition || !destinationPosition
        || !allStopsHavePositions
        || !stopsAreOrdered
        || pickupPosition.distanceMeters > MAX_ROUTE_DEVIATION_METERS
        || destinationPosition.distanceMeters > MAX_ROUTE_DEVIATION_METERS
        || pickupPosition.distanceAlongMeters >= destinationPosition.distanceAlongMeters) {
        return null;
      }

      const insertedWaypoints = [
        ...stopPositions.map((position, index) => ({ point: rideWaypoints[index + 1], position: position.distanceAlongMeters, order: index + 1 })),
        { point: request.pickup, position: pickupPosition.distanceAlongMeters, order: -2 },
        { point: request.destination, position: destinationPosition.distanceAlongMeters, order: -1 },
      ].sort((first, second) => first.position - second.position || first.order - second.order);
      const viaRoute = await getRoadRoute([
        ridePickup,
        ...insertedWaypoints.map(({ point }) => point),
        rideDestination,
      ], false);
      successfulRouteRequests += 1;
      const detourSeconds = Math.max(0, viaRoute.duration - directRoute.duration);
      if (detourSeconds > MAX_DETOUR_SECONDS) return null;

      return {
        ride,
        routeMatch: {
          routeDeviationMeters: Math.round(pickupPosition.distanceMeters + destinationPosition.distanceMeters),
          detourSeconds: Math.round(detourSeconds),
          pickupConvenienceMeters: Math.round(pickupPosition.distanceAlongMeters),
        },
      };
    } catch (_error) {
      failedRouteRequests += 1;
      return null;
    }
  });

  const matches = results.filter(Boolean).sort((first, second) => compareMatches(first, second, sort));
  return {
    rides: matches.map(({ ride, routeMatch }) => ({ ...ride.toObject(), routeMatch })),
    matching: {
      method: "road-route-estimate",
      available: failedRouteRequests === 0,
      unavailableRoutes: failedRouteRequests,
      maxDetourMinutes: MAX_DETOUR_SECONDS / 60,
      detourIsEstimated: true,
    },
  };
}

module.exports = { matchRides, validateRideWaypoints, MAX_DETOUR_SECONDS, MAX_ROUTE_DEVIATION_METERS };