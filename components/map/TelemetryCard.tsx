"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, PhoneCall, WifiOff } from "lucide-react";
import StatusPill from "@/components/ui/StatusPill";
import type { LiveDelivery } from "@/lib/demoState";
import { useApp } from "@/lib/store";

export default function TelemetryCard({ delivery }: { delivery: LiveDelivery }) {
  const setVoiceOpen = useApp((s) => s.setVoiceOpen);
  const openCall = useApp((s) => s.openCall);
  const done = delivery.status === "delivered";
  const plate = delivery.vehicle.split(" · ")[1] ?? delivery.vehicle;
  const bike = delivery.vehicle.split(" · ")[0];

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-md">
      <AnimatePresence>
        {delivery.offline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white"
          >
            <WifiOff className="size-4" />
            Last seen {delivery.lastSeenAt}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="rounded-t-[36px] bg-card px-5 pb-28 pt-3"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-sunken" />

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[14px] text-muted">{delivery.offline ? `${delivery.riderName}'s phone is offline` : done ? "Delivered" : "Arriving in"}</p>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={done ? "done" : delivery.etaMinutes}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="mt-0.5 flex items-baseline gap-1.5 text-ink"
              >
                <span className="text-[44px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">{done ? "Done" : delivery.etaMinutes}</span>
                {!done && <span className="text-[20px] font-semibold text-faint">min</span>}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="flex flex-col items-end gap-2 pt-1">
            <StatusPill status={delivery.status} />
            <p className="text-[13px] text-muted">
              {delivery.distanceKm != null && !delivery.offline ? `${delivery.distanceKm} km` : delivery.live ? "Live GPS" : ""}
            </p>
          </div>
        </div>

        <p className="mt-3 truncate text-[14px] text-muted">
          {delivery.offline ? "Last seen at" : "Now at"} <span className="font-semibold text-ink">{delivery.currentLocation}</span> · to {delivery.destination}
          {delivery.demoDest ? " (demo drop-off)" : ""}
        </p>

        <div className="mt-4 flex items-center justify-between rounded-[22px] bg-canvas p-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-wash text-[16px] font-bold text-brand">{delivery.riderName[0]}</span>
            <span className="min-w-0">
              <span className="block truncate text-[16px] font-semibold text-ink">{delivery.riderName}</span>
              <span className="block truncate text-[13px] text-muted">{bike}</span>
            </span>
          </div>
          <span className="shrink-0 rounded-[12px] px-3 py-1.5 text-[14px] font-semibold text-ink ring-[1.5px] ring-ink">{plate}</span>
        </div>

        <div className="mt-3 flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setVoiceOpen(true)}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-[16px] font-semibold text-white"
          >
            <Mic className="size-5" /> Ask Bimpe
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => openCall(delivery.waybillId)}
            aria-label="Get a call from Bimpe"
            className="grid size-14 place-items-center rounded-full bg-ink text-white"
          >
            <PhoneCall className="size-5" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
