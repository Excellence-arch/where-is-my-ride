"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Share2, Store } from "lucide-react";
import StatusPill from "@/components/ui/StatusPill";
import type { DeliveryStatus } from "@/lib/deliveries";
import { useLiveDelivery } from "@/lib/useLiveDelivery";
import { useApp } from "@/lib/store";

/** How far along each of the three legs (picked up · on the way · arriving) is. */
const PROGRESS: Record<DeliveryStatus, [number, number, number]> = {
  in_transit: [1, 0.55, 0],
  delayed: [1, 0.3, 0],
  arriving: [1, 1, 0.5],
  offline: [1, 0.55, 0],
  delivered: [1, 1, 1],
};

function plate(vehicle: string) {
  return vehicle.split(" · ")[1] ?? vehicle;
}

function place(full: string) {
  return full.split(",")[0];
}

/** Folder-shaped card: the waybill sits on the tab, the ETA inside. */
export default function DeliveryCard({ waybillId, compact = false }: { waybillId: string; compact?: boolean }) {
  const d = useLiveDelivery(waybillId);
  const openTracker = useApp((s) => s.openTracker);
  const [shared, setShared] = useState(false);

  const share = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/app?track=${d.waybillId}`;
    const text = `Track rider ${d.riderName} for waybill ${d.waybillId}`;
    try {
      if (navigator.share) await navigator.share({ title: "WhereIsMyRider", text, url });
      else await navigator.clipboard.writeText(`${text}: ${url}`);
    } catch {
      /* user cancelled the share sheet */
    }
    setShared(true);
    setTimeout(() => setShared(false), 1600);
  };

  const open = () => openTracker(d.waybillId);
  const dot = d.offline ? "bg-off" : d.status === "delayed" ? "bg-late" : d.status === "delivered" ? "bg-faint" : "bg-ok";

  if (compact) {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={open}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && open()}
        className="relative cursor-pointer"
      >
        <div className="flex h-10 w-[150px] items-center gap-2 rounded-t-[20px] bg-sunken pl-5 text-[15px] font-semibold text-ink">
          <span className={`size-2 rounded-full ${dot}`} />
          {d.waybillId}
        </div>
        <div className="-mt-px flex items-center justify-between rounded-[24px] rounded-tl-none bg-sunken px-5 py-4">
          <p className="min-w-0 truncate text-[15px] font-medium text-ink">
            {place(d.pickupFrom)} to {place(d.destination)}
          </p>
          <span className="shrink-0 pl-3 text-[13px] text-muted">{d.status === "delivered" ? "Delivered" : `${d.etaMinutes} min`}</span>
        </div>
      </motion.div>
    );
  }

  const legs = PROGRESS[d.status];
  const barColour = d.offline ? "bg-faint" : d.status === "delayed" ? "bg-late" : "bg-brand";

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && open()}
      className="relative cursor-pointer"
      layout
    >
      {/* Tab */}
      <div className="flex items-end justify-between">
        <div className="flex h-11 w-[170px] items-center gap-2 rounded-t-[22px] bg-ink pl-5 text-[16px] font-semibold text-white">
          <span className={`size-2 rounded-full ${dot}`} />
          {d.waybillId}
        </div>
        <button
          onClick={share}
          aria-label={`Share tracker for ${d.waybillId}`}
          className="mb-2 flex h-9 items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-ink ring-1 ring-line"
        >
          {shared ? <Check className="size-4 text-ok" /> : <Share2 className="size-4" />}
          {shared ? "Copied" : "Share"}
        </button>
      </div>

      <div className="rounded-[28px] rounded-tl-none bg-ink p-2.5">
        <div className="mx-2 mb-2 flex items-center justify-between rounded-[16px] bg-white/10 px-4 py-2.5 text-[13px] text-white">
          <span className="flex min-w-0 items-center gap-2">
            <Store className="size-4 shrink-0" />
            <span className="truncate">{place(d.pickupFrom)}</span>
          </span>
          <span className="shrink-0 pl-3 text-white/60">{d.orderedAt}</span>
        </div>

        <div className="rounded-[22px] bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted">{d.offline ? "Last update" : d.status === "delivered" ? "Delivered" : "Arriving in"}</span>
            <StatusPill status={d.status} />
          </div>
          <p className="mt-1 flex items-baseline gap-1.5 text-ink">
            <span className="text-[56px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">
              {d.status === "delivered" ? "Done" : d.etaMinutes}
            </span>
            {d.status !== "delivered" && <span className="text-[24px] font-semibold text-faint">min</span>}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-1.5" aria-hidden>
            {legs.map((v, i) => (
              <span key={i} className="h-1.5 overflow-hidden rounded-full bg-sunken">
                <motion.span
                  className={`block h-full rounded-full ${barColour}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${v * 100}%` }}
                  transition={{ duration: 0.9, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-muted">
            <span className="truncate">{d.currentLocation}</span>
            <span className="truncate pl-3 font-medium text-ink">{place(d.destination)}</span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-wash text-[15px] font-bold text-brand">{d.riderName[0]}</span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold text-ink">{d.riderName}</span>
                <span className="block truncate text-[12px] text-muted">{plate(d.vehicle)}</span>
              </span>
            </div>
            <span className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-ink px-5 text-[14px] font-semibold text-white">
              Track <ArrowUpRight className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
