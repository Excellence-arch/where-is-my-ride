"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, Navigation, PhoneCall, WifiOff } from "lucide-react";
import type { LiveDelivery } from "@/lib/demoState";
import { useApp } from "@/lib/store";

export default function TelemetryCard({ delivery }: { delivery: LiveDelivery }) {
  const setVoiceOpen = useApp((s) => s.setVoiceOpen);
  const openCall = useApp((s) => s.openCall);
  const etaTone =
    delivery.status === "delayed" ? "text-amber-600" : delivery.status === "arriving" ? "text-blue-600" : "text-slate-900";

  return (
    <div className="absolute inset-x-4 bottom-24 z-10">
      <AnimatePresence>
        {delivery.offline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          >
            <WifiOff className="h-4 w-4" />
            Last Known Location (Offline) · {delivery.lastSeenAt}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Navigation className="h-3.5 w-3.5" /> {delivery.offline ? "Last seen at" : "Currently at"}
            </p>
            <p className="mt-1 truncate text-lg font-bold text-slate-900">{delivery.currentLocation}</p>
            <p className="truncate text-sm text-slate-500">To {delivery.destination}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">ETA</p>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={delivery.etaMinutes}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`text-4xl font-extrabold leading-none tracking-tight ${etaTone}`}
              >
                {delivery.etaMinutes} <span className="text-xl font-bold">Mins</span>
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setVoiceOpen(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-semibold text-white"
          >
            <Mic className="h-4 w-4" /> Ask BimpeAI
          </button>
          <button
            onClick={() => openCall(delivery.waybillId)}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900"
          >
            <PhoneCall className="h-4 w-4" /> Call me
          </button>
        </div>
      </div>
    </div>
  );
}
