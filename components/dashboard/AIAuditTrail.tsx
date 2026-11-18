"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, MapPinned, PhoneCall, TrafficCone, WifiOff } from "lucide-react";
import { useApp, type AuditEntry } from "@/lib/store";

const ICONS: Record<AuditEntry["kind"], { Icon: typeof Bot; className: string }> = {
  ai: { Icon: Bot, className: "bg-brand-wash text-brand" },
  call: { Icon: PhoneCall, className: "bg-brand-wash text-brand" },
  network: { Icon: WifiOff, className: "bg-sunken text-ink" },
  traffic: { Icon: TrafficCone, className: "bg-[#fff1d6] text-[#9a5b00]" },
  geofence: { Icon: MapPinned, className: "bg-ok-wash text-ok" },
};

export default function AIAuditTrail() {
  const audit = useApp((s) => s.audit);

  return (
    <div className="rounded-[28px] border border-line bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold text-ink">Bimpe activity</h2>
        <span className="text-[13px] text-muted">Latest first</span>
      </div>
      <ol className="relative mt-4">
        <span className="absolute bottom-3 left-[17px] top-3 w-px bg-sunken" />
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
                  <p className="text-sm font-medium leading-snug text-ink">{e.text}</p>
                  <p className="mt-0.5 text-xs text-muted">{e.time}</p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </div>
  );
}
