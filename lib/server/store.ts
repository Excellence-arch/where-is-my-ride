import { neon } from "@neondatabase/serverless";
import { activeDeliveries } from "../deliveries";
import { DEFAULT_FLAGS, mergeLive, type DemoState, type LiveDelivery, type TripSnapshot } from "../demoState";
import { haversine, offset, type LatLng } from "../geo";

// Shared state for every serverless instance: Neon Postgres when DATABASE_URL
// is set (production), otherwise process memory (local dev / no-DB demo).

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
export const hasDatabase = Boolean(sql);

const memKv = new Map<string, unknown>();
const memTrips = new Map<string, TripSnapshot>();

// ---------- key/value ----------

export async function kvGet<T>(key: string): Promise<T | undefined> {
  if (!sql) return memKv.get(key) as T | undefined;
  const rows = (await sql`SELECT value FROM app_state WHERE key = ${key}`) as { value: T }[];
  return rows[0]?.value;
}

export async function kvSet<T>(key: string, value: T) {
  if (!sql) {
    memKv.set(key, value);
    return;
  }
  await sql`INSERT INTO app_state (key, value, updated_at) VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
}

// ---------- God Mode ----------

export async function getDemoState(): Promise<DemoState> {
  const s = await kvGet<DemoState>("demo").catch(() => undefined);
  return { flags: { ...DEFAULT_FLAGS, ...(s?.flags ?? {}) }, lastSeenAt: s?.lastSeenAt };
}

export async function setDemoState(patch: Partial<DemoState["flags"]>, lastSeenAt?: string) {
  const cur = await getDemoState();
  const next: DemoState = {
    flags: { ...cur.flags, ...patch },
    lastSeenAt: lastSeenAt !== undefined ? lastSeenAt || undefined : cur.lastSeenAt,
  };
  await kvSet("demo", next);
  return next;
}

// ---------- call context (phone -> waybill) ----------

const phoneKey = (p: string) => p.replace(/\D/g, "").slice(-10);

export async function setCallContext(phone: string, waybillId: string) {
  await kvSet(`call:${phoneKey(phone)}`, waybillId).catch(() => {});
}

export async function waybillForPhone(phone: string) {
  return kvGet<string>(`call:${phoneKey(phone)}`).catch(() => undefined);
}

// ---------- rider trips ----------

type TripRow = {
  waybill_id: string;
  rider_name: string;
  status: TripSnapshot["status"];
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  speed_mps: number | null;
  heading: number | null;
  landmark: string | null;
  landmark_lat: number | null;
  landmark_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  demo_dest: boolean;
  simulated: boolean;
  started_at: string | Date | null;
  updated_at: string | Date;
  delivered_at: string | Date | null;
};

const iso = (v: string | Date | null) => (v == null ? null : new Date(v).toISOString());

function fromRow(r: TripRow): TripSnapshot & { landmarkLat: number | null; landmarkLng: number | null } {
  return {
    waybillId: r.waybill_id,
    riderName: r.rider_name,
    status: r.status,
    lat: r.lat,
    lng: r.lng,
    accuracyM: r.accuracy_m,
    speedMps: r.speed_mps,
    heading: r.heading,
    landmark: r.landmark,
    landmarkLat: r.landmark_lat,
    landmarkLng: r.landmark_lng,
    destLat: r.dest_lat,
    destLng: r.dest_lng,
    demoDest: r.demo_dest,
    simulated: r.simulated,
    startedAt: iso(r.started_at),
    updatedAt: iso(r.updated_at)!,
    deliveredAt: iso(r.delivered_at),
  };
}

const memLandmarkPos = new Map<string, LatLng>();

export async function getTrip(waybillId: string) {
  if (!sql) {
    const t = memTrips.get(waybillId);
    const lp = memLandmarkPos.get(waybillId);
    return t ? { ...t, landmarkLat: lp?.lat ?? null, landmarkLng: lp?.lng ?? null } : undefined;
  }
  const rows = (await sql`SELECT * FROM rider_trips WHERE waybill_id = ${waybillId}`) as TripRow[];
  return rows[0] ? fromRow(rows[0]) : undefined;
}

export async function getTrips(): Promise<TripSnapshot[]> {
  if (!sql) return [...memTrips.values()];
  const rows = (await sql`SELECT * FROM rider_trips`) as TripRow[];
  return rows.map(fromRow);
}

export interface Fix {
  lat: number;
  lng: number;
  accuracyM?: number | null;
  speedMps?: number | null;
  heading?: number | null;
  simulated?: boolean;
}

// If the rider is demoing far away from the real drop-off (e.g. not in Lagos),
// anchor a stand-in drop-off a few km away so the ETA and geofence still work.
const DEMO_DEST_THRESHOLD_M = 30_000;
const DEMO_DEST_DISTANCE_M = 3_200;

export async function startTrip(waybillId: string, fix: Fix) {
  const base = activeDeliveries[waybillId];
  if (!base) throw new Error("Unknown waybill");
  const realDest = { lat: base.destLat, lng: base.destLng };
  const farAway = haversine(fix, realDest) > DEMO_DEST_THRESHOLD_M;
  const dest = farAway ? offset(fix, DEMO_DEST_DISTANCE_M, 45) : realDest;
  const landmark = await reverseGeocode(fix);
  const now = new Date().toISOString();
  const trip: TripSnapshot = {
    waybillId,
    riderName: base.riderName,
    status: "en_route",
    lat: fix.lat,
    lng: fix.lng,
    accuracyM: fix.accuracyM ?? null,
    speedMps: fix.speedMps ?? null,
    heading: fix.heading ?? null,
    landmark,
    destLat: dest.lat,
    destLng: dest.lng,
    demoDest: farAway,
    simulated: Boolean(fix.simulated),
    startedAt: now,
    updatedAt: now,
    deliveredAt: null,
  };
  if (!sql) {
    memTrips.set(waybillId, trip);
    memLandmarkPos.set(waybillId, fix);
    return trip;
  }
  await sql`
    INSERT INTO rider_trips (waybill_id, rider_name, status, lat, lng, accuracy_m, speed_mps, heading, landmark,
      landmark_lat, landmark_lng, dest_lat, dest_lng, demo_dest, simulated, geofence_hit_at, started_at, updated_at, delivered_at)
    VALUES (${waybillId}, ${base.riderName}, 'en_route', ${fix.lat}, ${fix.lng}, ${trip.accuracyM}, ${trip.speedMps},
      ${trip.heading}, ${landmark}, ${fix.lat}, ${fix.lng}, ${dest.lat}, ${dest.lng}, ${farAway}, ${trip.simulated},
      NULL, now(), now(), NULL)
    ON CONFLICT (waybill_id) DO UPDATE SET
      rider_name = EXCLUDED.rider_name, status = 'en_route', lat = EXCLUDED.lat, lng = EXCLUDED.lng,
      accuracy_m = EXCLUDED.accuracy_m, speed_mps = EXCLUDED.speed_mps, heading = EXCLUDED.heading,
      landmark = EXCLUDED.landmark, landmark_lat = EXCLUDED.landmark_lat, landmark_lng = EXCLUDED.landmark_lng,
      dest_lat = EXCLUDED.dest_lat, dest_lng = EXCLUDED.dest_lng, demo_dest = EXCLUDED.demo_dest,
      simulated = EXCLUDED.simulated, geofence_hit_at = NULL, started_at = now(), updated_at = now(), delivered_at = NULL`;
  return trip;
}

// Re-geocode only after moving this far from the last named landmark.
const LANDMARK_REFRESH_M = 250;

export async function updateLocation(waybillId: string, fix: Fix) {
  const trip = await getTrip(waybillId);
  if (!trip || trip.status !== "en_route") return undefined;

  let landmark = trip.landmark;
  let landmarkPos: LatLng | null =
    trip.landmarkLat != null && trip.landmarkLng != null ? { lat: trip.landmarkLat, lng: trip.landmarkLng } : null;
  if (!landmarkPos || haversine(landmarkPos, fix) > LANDMARK_REFRESH_M) {
    const named = await reverseGeocode(fix);
    if (named) {
      landmark = named;
      landmarkPos = { lat: fix.lat, lng: fix.lng };
    }
  }

  if (!sql) {
    const next: TripSnapshot = {
      ...trip,
      lat: fix.lat,
      lng: fix.lng,
      accuracyM: fix.accuracyM ?? null,
      speedMps: fix.speedMps ?? null,
      heading: fix.heading ?? trip.heading,
      landmark,
      simulated: Boolean(fix.simulated),
      updatedAt: new Date().toISOString(),
    };
    memTrips.set(waybillId, next);
    if (landmarkPos) memLandmarkPos.set(waybillId, landmarkPos);
    return next;
  }
  const rows = (await sql`
    UPDATE rider_trips SET lat = ${fix.lat}, lng = ${fix.lng}, accuracy_m = ${fix.accuracyM ?? null},
      speed_mps = ${fix.speedMps ?? null}, heading = COALESCE(${fix.heading ?? null}, heading),
      landmark = ${landmark}, landmark_lat = ${landmarkPos?.lat ?? null}, landmark_lng = ${landmarkPos?.lng ?? null},
      simulated = ${Boolean(fix.simulated)}, updated_at = now()
    WHERE waybill_id = ${waybillId} AND status = 'en_route'
    RETURNING *`) as TripRow[];
  return rows[0] ? fromRow(rows[0]) : undefined;
}

export async function finishTrip(waybillId: string, status: "delivered" | "idle") {
  if (!sql) {
    const t = memTrips.get(waybillId);
    if (t) memTrips.set(waybillId, { ...t, status, deliveredAt: status === "delivered" ? new Date().toISOString() : null });
    return;
  }
  await sql`UPDATE rider_trips SET status = ${status}, updated_at = now(),
    delivered_at = ${status === "delivered" ? new Date().toISOString() : null}
    WHERE waybill_id = ${waybillId}`;
}

// ---------- reverse geocoding (OpenStreetMap Nominatim) ----------

async function reverseGeocode({ lat, lng }: LatLng): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "WhereIsMyRider/1.0 (hackathon demo)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { name?: string; address?: Record<string, string> };
    const a = j.address ?? {};
    const place = j.name || a.road || a.pedestrian || a.amenity || a.neighbourhood;
    const area = a.suburb || a.neighbourhood || a.city_district || a.town || a.city;
    if (place && area && place !== area) return `${place}, ${area}`;
    return place || area || null;
  } catch {
    return null;
  }
}

// ---------- merged view ----------

export async function getLiveDelivery(waybillId: string): Promise<LiveDelivery | undefined> {
  const base = activeDeliveries[waybillId];
  if (!base) return undefined;
  const [trip, state] = await Promise.all([getTrip(waybillId).catch(() => undefined), getDemoState()]);
  return mergeLive(base, trip, state);
}

export async function getAllLive() {
  const [trips, state] = await Promise.all([getTrips().catch(() => [] as TripSnapshot[]), getDemoState()]);
  const byId = new Map(trips.map((t) => [t.waybillId, t]));
  return {
    state,
    trips: Object.fromEntries(trips.map((t) => [t.waybillId, t])),
    deliveries: Object.fromEntries(
      Object.values(activeDeliveries).map((d) => [d.waybillId, mergeLive(d, byId.get(d.waybillId), state)]),
    ),
  };
}
