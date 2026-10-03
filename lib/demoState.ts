import type { Delivery } from "./deliveries";
import { etaMinutes, GEOFENCE_METERS, haversine, STALE_AFTER_MS } from "./geo";

// Shared (client + server) logic that turns a static order + the rider's live
// GPS trip + God Mode flags into what the customer sees and the agent says.

export interface DemoFlags {
  networkDrop: boolean;
  heavyTraffic: boolean;
  geofenceBreached: boolean;
}

export const DEFAULT_FLAGS: DemoFlags = {
  networkDrop: false,
  heavyTraffic: false,
  geofenceBreached: false,
};

export interface CustomerProfile {
  name: string;
  phone: string;
}

export interface DemoState {
  flags: DemoFlags;
  /** The signed-in customer: demo orders are delivered to them. */
  customer?: CustomerProfile | null;
  /** Time label shown on the "Last Known Location" badge for a forced network drop. */
  lastSeenAt?: string;
}

export const TRAFFIC_ETA_MINUTES = 35;
export const TRAFFIC_DELAY_MINUTES = 20;
export const GEOFENCE_ETA_MINUTES = 2;

/** A rider's live trip, as stored by the rider app. */
export interface TripSnapshot {
  waybillId: string;
  riderName: string;
  /** Set when a registered rider has claimed this delivery. */
  riderPhone: string | null;
  vehicle: string | null;
  status: "idle" | "en_route" | "delivered";
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  speedMps: number | null;
  heading: number | null;
  landmark: string | null;
  destLat: number | null;
  destLng: number | null;
  demoDest: boolean;
  simulated: boolean;
  startedAt: string | null;
  updatedAt: string;
  deliveredAt: string | null;
}

export interface LiveDelivery extends Delivery {
  offline: boolean;
  lastSeenAt?: string;
  /** True when location/ETA come from the rider's real (or simulated) GPS. */
  live: boolean;
  distanceKm?: number;
  rider?: { lat: number; lng: number; heading: number | null; accuracyM: number | null; updatedAt: string };
  demoDest?: boolean;
}

export const timeLabel = (d: Date) =>
  d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" });

/**
 * Merge order + live trip + God Mode. Flags only apply to the hero order
 * (LG-90210 / Segun) so the other cards stay calm during the pitch.
 */
export function mergeLive(
  base: Delivery,
  trip: TripSnapshot | null | undefined,
  state: DemoState,
  now = Date.now(),
): LiveDelivery {
  let d: LiveDelivery = { ...base, offline: false, live: false };

  // Registered people replace the demo names: the signed-in customer and the
  // rider who claimed this delivery.
  if (state.customer?.name) d = { ...d, customerName: state.customer.name, customerPhone: state.customer.phone };
  if (trip?.riderPhone) {
    d = { ...d, riderName: trip.riderName, riderPhone: trip.riderPhone, vehicle: trip.vehicle ?? d.vehicle };
  }

  if (trip && trip.status === "delivered") {
    return { ...d, status: "delivered", etaMinutes: 0, live: true, currentLocation: base.destination };
  }

  if (trip && trip.status === "en_route" && trip.lat != null && trip.lng != null) {
    const dest = { lat: trip.destLat ?? base.destLat, lng: trip.destLng ?? base.destLng };
    const dist = haversine({ lat: trip.lat, lng: trip.lng }, dest);
    const updated = Date.parse(trip.updatedAt);
    d = {
      ...d,
      live: true,
      demoDest: trip.demoDest,
      distanceKm: Math.round(dist / 100) / 10,
      // Never surface raw coordinates; they're unreadable on screen and on a call.
      currentLocation: trip.landmark || `about ${(Math.round(dist / 100) / 10).toFixed(1)} km from ${base.destination}`,
      etaMinutes: etaMinutes(dist, trip.speedMps),
      status: dist <= GEOFENCE_METERS ? "arriving" : "in_transit",
      rider: { lat: trip.lat, lng: trip.lng, heading: trip.heading, accuracyM: trip.accuracyM, updatedAt: trip.updatedAt },
    };
    // Real network drop: the rider's phone stopped reporting.
    if (now - updated > STALE_AFTER_MS) {
      d = { ...d, offline: true, status: "offline", lastSeenAt: timeLabel(new Date(updated)) };
    }
  }

  if (base.waybillId !== "LG-90210") return d;

  const { flags } = state;
  if (flags.heavyTraffic) {
    d = {
      ...d,
      etaMinutes: d.live ? d.etaMinutes + TRAFFIC_DELAY_MINUTES : TRAFFIC_ETA_MINUTES,
      status: d.offline ? d.status : "delayed",
    };
  }
  if (flags.geofenceBreached && !d.live) {
    d = { ...d, etaMinutes: GEOFENCE_ETA_MINUTES, status: "arriving", currentLocation: "Opebi Link Bridge" };
  }
  if (flags.networkDrop) {
    d = { ...d, offline: true, status: "offline", lastSeenAt: d.lastSeenAt ?? state.lastSeenAt };
  }
  return d;
}

/**
 * The sentence the voice agent reads back to the customer. Polite, standard
 * English the way a Nigerian customer-care agent speaks: no Pidgin or slang.
 */
export function spokenStatus(d: LiveDelivery): string {
  // "at Ikeja Underbridge" vs. "about 3.0 km from Allen Avenue" (GPS fix without a street name).
  const where = d.currentLocation.startsWith("about ") ? d.currentLocation : `at ${d.currentLocation}`;
  if (d.status === "delivered") {
    return `Your order has been delivered by ${d.riderName}. Thank you for choosing WhereIsMyRider, and enjoy your order.`;
  }
  if (d.offline) {
    return `I'm sorry, ${d.riderName}'s phone has lost network for the moment. He was last seen ${where}${
      d.lastSeenAt ? ` at ${d.lastSeenAt}` : ""
    }. Please don't worry, I will update you as soon as he is back online.`;
  }
  if (d.status === "delayed") {
    return `${d.riderName} is ${where}, but there is heavy traffic on the road. He should get to you in about ${d.etaMinutes} minutes. Thank you for your patience.`;
  }
  if (d.status === "arriving" && d.etaMinutes <= 5) {
    return `Good news. ${d.riderName} is just about ${d.etaMinutes} minute${d.etaMinutes === 1 ? "" : "s"} away, ${where}. Please get ready to receive your order.`;
  }
  return `${d.riderName} is currently ${where}, and he should get to you in about ${d.etaMinutes} minutes.`;
}
