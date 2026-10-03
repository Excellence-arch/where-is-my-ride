"use client";

import { useEffect, useRef } from "react";
import { activeDeliveries } from "@/lib/deliveries";
import { mergeLive, type DemoState, type TripSnapshot } from "@/lib/demoState";
import { GEOFENCE_METERS } from "@/lib/geo";
import { useApp } from "@/lib/store";

const POLL_MS = 3000;

/**
 * Keeps the customer app in sync with the server: live rider GPS trips and
 * God Mode. Also fires the real 2 km geofence alert when a live rider
 * crosses into range.
 */
export default function LiveSync() {
  const applyServer = useApp((s) => s.applyServer);
  const lastDistance = useRef<Record<string, number | undefined>>({});
  const lastStatus = useRef<Record<string, string | undefined>>({});

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as { trips: Record<string, TripSnapshot>; state: DemoState };
          applyServer(json.trips ?? {}, json.state);
          checkEvents(json.trips ?? {});
        }
      } catch {
        /* offline — keep showing the last known state */
      }
      if (!stop) timer = setTimeout(tick, document.visibilityState === "visible" ? POLL_MS : POLL_MS * 4);
    };

    const checkEvents = (trips: Record<string, TripSnapshot>) => {
      const s = useApp.getState();
      for (const trip of Object.values(trips)) {
        const base = activeDeliveries[trip.waybillId];
        if (!base) continue;
        const d = mergeLive(base, trip, { flags: s.flags, lastSeenAt: s.lastSeenAt });
        const prevDist = lastDistance.current[trip.waybillId];
        const dist = d.distanceKm != null ? d.distanceKm * 1000 : undefined;
        if (dist != null && prevDist != null && prevDist > GEOFENCE_METERS && dist <= GEOFENCE_METERS) {
          s.showToast("Rider Approaching", `${d.riderName} is ${d.etaMinutes} minute${d.etaMinutes === 1 ? "" : "s"} away.`);
          s.addAudit(`Geofence: ${d.riderName} entered the 2km radius for ${d.waybillId}`, "geofence");
        }
        const prevStatus = lastStatus.current[trip.waybillId];
        if (prevStatus && prevStatus !== trip.status) {
          if (trip.status === "en_route") s.addAudit(`${d.riderName} started live GPS for ${d.waybillId}`, "ai");
          if (trip.status === "delivered") {
            s.showToast("Delivered", `${d.riderName} has delivered ${d.waybillId}.`);
            s.addAudit(`${d.riderName} marked ${d.waybillId} as delivered`, "geofence");
          }
        }
        lastDistance.current[trip.waybillId] = dist;
        lastStatus.current[trip.waybillId] = trip.status;
      }
    };

    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [applyServer]);

  return null;
}
