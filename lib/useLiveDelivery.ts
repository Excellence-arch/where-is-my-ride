"use client";

import { activeDeliveries } from "./deliveries";
import { applyFlags, type LiveDelivery } from "./demoState";
import { useApp } from "./store";

/** A delivery with God Mode overrides applied — same logic the webhook uses. */
export function useLiveDelivery(waybillId: string): LiveDelivery {
  const flags = useApp((s) => s.flags);
  const lastSeenAt = useApp((s) => s.lastSeenAt);
  return applyFlags(activeDeliveries[waybillId], flags, lastSeenAt);
}
