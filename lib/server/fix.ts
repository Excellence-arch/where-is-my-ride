import type { Fix } from "./store";

/** Validate a GPS fix posted by the rider app. */
export function parseFix(body: Record<string, unknown>): Fix | null {
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  return {
    lat,
    lng,
    accuracyM: num(body.accuracyM),
    speedMps: num(body.speedMps),
    heading: num(body.heading),
    simulated: Boolean(body.simulated),
  };
}
