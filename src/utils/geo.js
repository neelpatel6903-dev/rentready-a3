/**
 * geo.js
 * Pure distance maths for the suburb and listing features. Approximate
 * coordinates come from the local data files; nothing here calls an
 * external map or location service.
 */

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two points in kilometres (unrounded). */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Distance in kilometres, rounded to one decimal place for display. */
export function distanceKm(lat1, lng1, lat2, lng2) {
  return Math.round(haversineKm(lat1, lng1, lat2, lng2) * 10) / 10;
}

/** The nearest entry (by haversine distance) in a list of { lat, lng } points. */
export function nearestByDistance(points, lat, lng) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const point of points) {
    const distance = haversineKm(lat, lng, point.lat, point.lng);
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }
  return nearest;
}