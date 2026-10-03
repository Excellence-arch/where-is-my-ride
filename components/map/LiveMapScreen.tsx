"use client";

import { useApp } from "@/lib/store";
import { useLiveDelivery } from "@/lib/useLiveDelivery";
import StaticMap from "./StaticMap";
import TrackingSummary from "./TrackingSummary";
import TelemetryCard from "./TelemetryCard";

// Where the rider sits on the route for each state (0 = pickup, 1 = customer).
// Based on ETA only, so the offline ghost pin stays where the rider was last seen.
function routeProgress(eta: number) {
  if (eta <= 2) return 0.9;
  if (eta <= 10) return 0.75;
  return 0.42;
}

export default function LiveMapScreen() {
  const waybillId = useApp((s) => s.selectedWaybill);
  const delivery = useLiveDelivery(waybillId);
  const offline = delivery.offline;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-100">
      <StaticMap riderVisible={!offline} progress={routeProgress(delivery.etaMinutes)} ghost={offline} />
      <TrackingSummary delivery={delivery} />
      <TelemetryCard delivery={delivery} />
    </div>
  );
}
