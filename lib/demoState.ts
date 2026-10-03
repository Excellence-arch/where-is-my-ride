import { activeDeliveries, type Delivery } from "./deliveries";

// God Mode flags. The client mirrors these to the server (POST /api/demo-state)
// so the BimpeAI voice agent tells the same story as the screen.
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

export const TRAFFIC_ETA_MINUTES = 35;
export const GEOFENCE_ETA_MINUTES = 2;

export interface LiveDelivery extends Delivery {
  offline: boolean;
  lastSeenAt?: string;
}

/** Apply God Mode overrides to the hero delivery (LG-90210 / Segun). */
export function applyFlags(delivery: Delivery, flags: DemoFlags, lastSeenAt?: string): LiveDelivery {
  if (delivery.waybillId !== "LG-90210") return { ...delivery, offline: false };
  let live: LiveDelivery = { ...delivery, offline: false };
  if (flags.heavyTraffic) live = { ...live, etaMinutes: TRAFFIC_ETA_MINUTES, status: "delayed" };
  if (flags.geofenceBreached) {
    live = { ...live, etaMinutes: GEOFENCE_ETA_MINUTES, status: "arriving", currentLocation: "Opebi Link Bridge" };
  }
  if (flags.networkDrop) live = { ...live, offline: true, status: "offline", lastSeenAt };
  return live;
}

// Server-side, in-memory copy. Good enough for a single demo instance; on
// multi-instance serverless hosts the voice agent may see defaults.
const serverState: { flags: DemoFlags; lastSeenAt?: string } = { flags: { ...DEFAULT_FLAGS } };

export function getServerFlags() {
  return serverState;
}

export function setServerFlags(flags: Partial<DemoFlags>, lastSeenAt?: string) {
  serverState.flags = { ...serverState.flags, ...flags };
  if (lastSeenAt !== undefined) serverState.lastSeenAt = lastSeenAt;
  return serverState;
}

export function liveDelivery(waybillId: string): LiveDelivery | undefined {
  const d = activeDeliveries[waybillId];
  if (!d) return undefined;
  return applyFlags(d, serverState.flags, serverState.lastSeenAt);
}

/** The sentence the voice agent reads back to the customer. */
export function spokenStatus(d: LiveDelivery): string {
  if (d.offline) {
    return `Rider ${d.riderName}'s network is currently unstable. The last known location was ${d.currentLocation}${
      d.lastSeenAt ? ` at ${d.lastSeenAt}` : ""
    }. I'll keep watching and update you as soon as the signal returns.`;
  }
  if (d.status === "delayed") {
    return `Rider ${d.riderName} is at ${d.currentLocation} but is stuck in heavy traffic. The new arrival time is about ${d.etaMinutes} minutes.`;
  }
  if (d.status === "arriving" && d.etaMinutes <= 2) {
    return `Good news! Rider ${d.riderName} is just ${d.etaMinutes} minutes away, at ${d.currentLocation}. Please get ready to receive your package.`;
  }
  return `Rider ${d.riderName} is currently at ${d.currentLocation}, arriving in ${d.etaMinutes} minutes.`;
}
