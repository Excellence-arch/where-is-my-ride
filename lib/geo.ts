// Small geo helpers: no map SDK needed on the server.

export interface LatLng {
  lat: number;
  lng: number;
}

const R = 6371000; // earth radius, metres
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearing(a: LatLng, b: LatLng) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Point `meters` away from `from` along `bearingDeg`. */
export function offset(from: LatLng, meters: number, bearingDeg: number): LatLng {
  const d = meters / R;
  const b = rad(bearingDeg);
  const lat1 = rad(from.lat);
  const lng1 = rad(from.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b));
  const lng2 = lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: deg(lat2), lng: deg(lng2) };
}

/** Move from a towards b by at most `meters`. */
export function stepTowards(a: LatLng, b: LatLng, meters: number): LatLng {
  const dist = haversine(a, b);
  if (dist <= meters) return { ...b };
  return offset(a, meters, bearing(a, b));
}

// Lagos dispatch bikes average ~18 km/h door to door once you count go-slow.
const CITY_SPEED_MPS = 5;

/** ETA in whole minutes from remaining distance and (optional) current GPS speed. */
export function etaMinutes(distanceM: number, speedMps?: number | null) {
  // Road distance is ~1.3x straight-line in Lagos.
  const road = distanceM * 1.3;
  const speed = speedMps && speedMps > 2 ? (speedMps + CITY_SPEED_MPS) / 2 : CITY_SPEED_MPS;
  return Math.max(1, Math.round(road / speed / 60));
}

export const GEOFENCE_METERS = 2000;
export const STALE_AFTER_MS = 45_000;
