"use client";

import dynamic from "next/dynamic";
import { activeDeliveries } from "@/lib/deliveries";
import { useApp } from "@/lib/store";
import { useLiveDelivery } from "@/lib/useLiveDelivery";
import StaticMap from "./StaticMap";
import TrackingSummary from "./TrackingSummary";
import TelemetryCard from "./TelemetryCard";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

// Where the rider sits on the static route (0 = pickup, 1 = customer).
// Based on ETA only, so the offline ghost pin stays where the rider was last seen.
function routeProgress(eta: number) {
  if (eta <= 2) return 0.9;
  if (eta <= 10) return 0.75;
  return 0.42;
}

export default function LiveMapScreen() {
  const waybillId = useApp((s) => s.selectedWaybill);
  const trip = useApp((s) => s.trips[waybillId]);
  const delivery = useLiveDelivery(waybillId);
  const offline = delivery.offline;
  const base = activeDeliveries[waybillId];

  // Real map once the rider app is sharing GPS for this order; the static
  // illustration otherwise (no network dependency for the scripted demo).
  const hasGps = Boolean(delivery.rider);
  const dest = { lat: trip?.destLat ?? base.destLat, lng: trip?.destLng ?? base.destLng };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-100">
      {hasGps ? (
        <LeafletMap rider={delivery.rider} dest={dest} ghost={offline} padTop={96} padBottom={300} />
      ) : (
        <StaticMap riderVisible={!offline} progress={routeProgress(delivery.etaMinutes)} ghost={offline} />
      )}
      <TrackingSummary delivery={delivery} />
      <TelemetryCard delivery={delivery} />
    </div>
  );
}
