import { neon } from "@neondatabase/serverless";
import { activeDeliveries } from "../deliveries";
import {
  DEFAULT_FLAGS,
  mergeLive,
  type CustomerProfile,
  type DemoState,
  type LiveDelivery,
  type TripSnapshot,
} from "../demoState";
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
  const [s, customer] = await Promise.all([
    kvGet<DemoState>("demo").catch(() => undefined),
    kvGet<CustomerProfile>("active_customer").catch(() => undefined),
  ]);
  return { flags: { ...DEFAULT_FLAGS, ...(s?.flags ?? {}) }, lastSeenAt: s?.lastSeenAt, customer: customer ?? null };
}

export async function setDemoState(patch: Partial<DemoState["flags"]>, lastSeenAt?: string) {
  const cur = await getDemoState();
  const next: DemoState = {
    flags: { ...cur.flags, ...patch },
    lastSeenAt: lastSeenAt !== undefined ? lastSeenAt || undefined : cur.lastSeenAt,
  };
  await kvSet("demo", { flags: next.flags, lastSeenAt: next.lastSeenAt });
  return { ...next, customer: cur.customer };
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
  rider_phone: string | null;
  vehicle: string | null;
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
    riderPhone: r.rider_phone,
    vehicle: r.vehicle,
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
  const [landmark, existing] = await Promise.all([reverseGeocode(fix), getTrip(waybillId)]);
  const now = new Date().toISOString();
  const trip: TripSnapshot = {
    waybillId,
    riderName: existing?.riderName ?? base.riderName,
    riderPhone: existing?.riderPhone ?? null,
    vehicle: existing?.vehicle ?? null,
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
    INSERT INTO rider_trips (waybill_id, rider_name, rider_phone, vehicle, status, lat, lng, accuracy_m, speed_mps, heading, landmark,
      landmark_lat, landmark_lng, dest_lat, dest_lng, demo_dest, simulated, geofence_hit_at, started_at, updated_at, delivered_at)
    VALUES (${waybillId}, ${trip.riderName}, ${trip.riderPhone}, ${trip.vehicle}, 'en_route', ${fix.lat}, ${fix.lng}, ${trip.accuracyM}, ${trip.speedMps},
      ${trip.heading}, ${landmark}, ${fix.lat}, ${fix.lng}, ${dest.lat}, ${dest.lng}, ${farAway}, ${trip.simulated},
      NULL, now(), now(), NULL)
    ON CONFLICT (waybill_id) DO UPDATE SET
      status = 'en_route', lat = EXCLUDED.lat, lng = EXCLUDED.lng,
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

// ---------- people: customers & riders ----------

export interface RiderProfile {
  phone: string;
  name: string;
  vehicleType: string;
  plate: string;
  waybillId: string | null;
}

/** Canonical phone key: last 10 digits, so 0803… and +234803… match. */
export const normPhone = (p: string) => p.replace(/\D/g, "").slice(-10);

const memCustomers = new Map<string, CustomerProfile>();
const memRiders = new Map<string, RiderProfile>();

export async function getCustomer(phone: string): Promise<CustomerProfile | undefined> {
  const key = normPhone(phone);
  if (!sql) return memCustomers.get(key);
  const rows = (await sql`SELECT phone, name FROM customers WHERE phone = ${key}`) as CustomerProfile[];
  return rows[0];
}

/** Register or update a customer and make them the recipient of the demo orders. */
export async function upsertCustomer(phone: string, name: string) {
  const c: CustomerProfile = { phone: normPhone(phone), name };
  if (!sql) memCustomers.set(c.phone, c);
  else
    await sql`INSERT INTO customers (phone, name) VALUES (${c.phone}, ${name})
              ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`;
  await kvSet("active_customer", { name, phone: `+234${c.phone}` });
  return c;
}

type RiderRow = { phone: string; name: string; vehicle_type: string; plate: string; waybill_id: string | null };
const riderFromRow = (r: RiderRow): RiderProfile => ({
  phone: r.phone,
  name: r.name,
  vehicleType: r.vehicle_type,
  plate: r.plate,
  waybillId: r.waybill_id,
});

export async function getRider(phone: string): Promise<RiderProfile | undefined> {
  const key = normPhone(phone);
  if (!sql) return memRiders.get(key);
  const rows = (await sql`SELECT * FROM riders WHERE phone = ${key}`) as RiderRow[];
  return rows[0] ? riderFromRow(rows[0]) : undefined;
}

export async function upsertRider(input: Omit<RiderProfile, "waybillId">) {
  const key = normPhone(input.phone);
  if (!sql) {
    const prev = memRiders.get(key);
    const r = { ...input, phone: key, waybillId: prev?.waybillId ?? null };
    memRiders.set(key, r);
    return r;
  }
  const rows = (await sql`INSERT INTO riders (phone, name, vehicle_type, plate) VALUES (${key}, ${input.name}, ${input.vehicleType}, ${input.plate})
    ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, vehicle_type = EXCLUDED.vehicle_type, plate = EXCLUDED.plate, updated_at = now()
    RETURNING *`) as RiderRow[];
  return riderFromRow(rows[0]);
}

/** Who currently holds each delivery (for the rider's job list). */
export async function listAssignments(): Promise<Record<string, string>> {
  const trips = await getTrips();
  return Object.fromEntries(trips.filter((t) => t.riderPhone).map((t) => [t.waybillId, t.riderName]));
}

/** A registered rider claims a delivery; any previous holder is released. */
export async function assignRider(phone: string, waybillId: string) {
  const rider = await getRider(phone);
  if (!rider) throw new Error("Rider not registered");
  const base = activeDeliveries[waybillId];
  if (!base) throw new Error("Unknown waybill");
  const vehicle = `${rider.vehicleType} · ${rider.plate}`;
  const riderPhone = `+234${rider.phone}`;

  if (!sql) {
    for (const r of memRiders.values()) if (r.waybillId === waybillId) r.waybillId = null;
    memRiders.set(rider.phone, { ...rider, waybillId });
    const t = memTrips.get(waybillId);
    memTrips.set(waybillId, {
      ...(t ?? {
        waybillId,
        status: "idle",
        lat: null,
        lng: null,
        accuracyM: null,
        speedMps: null,
        heading: null,
        landmark: null,
        destLat: null,
        destLng: null,
        demoDest: false,
        simulated: false,
        startedAt: null,
        deliveredAt: null,
        updatedAt: new Date().toISOString(),
      }),
      riderName: rider.name,
      riderPhone,
      vehicle,
      // A new rider starts fresh.
      ...(t && t.riderPhone !== riderPhone ? { status: "idle" as const } : {}),
    });
    return { ...rider, waybillId };
  }
  await sql`UPDATE riders SET waybill_id = NULL, updated_at = now() WHERE waybill_id = ${waybillId} AND phone <> ${rider.phone}`;
  await sql`UPDATE riders SET waybill_id = ${waybillId}, updated_at = now() WHERE phone = ${rider.phone}`;
  await sql`INSERT INTO rider_trips (waybill_id, rider_name, rider_phone, vehicle, status, updated_at)
    VALUES (${waybillId}, ${rider.name}, ${riderPhone}, ${vehicle}, 'idle', now())
    ON CONFLICT (waybill_id) DO UPDATE SET
      status = CASE WHEN rider_trips.rider_phone IS DISTINCT FROM EXCLUDED.rider_phone THEN 'idle' ELSE rider_trips.status END,
      rider_name = EXCLUDED.rider_name, rider_phone = EXCLUDED.rider_phone, vehicle = EXCLUDED.vehicle, updated_at = now()`;
  return { ...rider, waybillId };
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
