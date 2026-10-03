"use client";

import { activeDeliveries } from "./deliveries";
import { mergeLive, type LiveDelivery } from "./demoState";
import { useApp } from "./store";

/**
 * A delivery with the rider's live GPS trip and God Mode applied — the same
 * merge the webhook and voice agent use on the server.
 */
export function useLiveDelivery(waybillId: string): LiveDelivery {
  const flags = useApp((s) => s.flags);
  const lastSeenAt = useApp((s) => s.lastSeenAt);
  const trip = useApp((s) => s.trips[waybillId]);
  return mergeLive(activeDeliveries[waybillId], trip, { flags, lastSeenAt });
}
