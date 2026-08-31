// Geometry helpers for cardio routes. Routes store only their tapped
// waypoints (a handful of {latitude, longitude} points) — distance is
// computed once at save time from straight lines between consecutive
// points, never stored as a dense polyline or GPS trace.

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function routeDistanceMeters(waypoints) {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += haversineMeters(waypoints[i - 1], waypoints[i]);
  }
  return total;
}

export const routeDistanceKm = (route) => (route.distanceMeters || 0) / 1000;
