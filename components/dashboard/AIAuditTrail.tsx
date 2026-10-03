"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, MapPinned, PhoneCall, TrafficCone, WifiOff } from "lucide-react";
import { useApp, type AuditEntry } from "@/lib/store";

const ICONS: Record<AuditEntry["kind"], { Icon: typeof Bot; className: string }> = {
  ai: { Icon: Bot, className: "bg-blue-100 text-blue-700" },
  call: { Icon: PhoneCall, className: "bg-blue-100 text-blue-700" },
  network: { Icon: WifiOff, className: "bg-slate-200 text-slate-700" },
  traffic: { Icon: TrafficCone, className: "bg-amber-100 text-amber-700" },
  geofence: { Icon: MapPinned, className: "bg-emerald-100 text-emerald-700" },
};

export default function AIAuditTrail() {
  const audit = useApp((s) => s.audit);

  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-bold text-slate-900">AI audit trail</h2>
        <span className="text-xs font-medium text-slate-400">Background actions</span>
      </div>
      <ol className="relative mt-4">
        <span className="absolute bottom-3 left-[17px] top-3 w-px bg-slate-100" />
        <AnimatePresence initial={false}>
          {audit.slice(0, 6).map((e) => {
            const { Icon, className } = ICONS[e.kind];
            return (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="relative flex gap-3 py-2"
              >
                <span className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${className}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm font-medium leading-snug text-slate-900">{e.text}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{e.time}</p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </div>
  );
}
