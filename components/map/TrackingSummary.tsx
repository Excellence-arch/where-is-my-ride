"use client";

import { ArrowLeft, Phone } from "lucide-react";
import type { LiveDelivery } from "@/lib/demoState";
import { useApp } from "@/lib/store";

const glass = "bg-white/80 ring-1 ring-white backdrop-blur-xl";

export default function TrackingSummary({ delivery }: { delivery: LiveDelivery }) {
  const go = useApp((s) => s.go);
  const dot = delivery.offline ? "bg-off" : delivery.status === "delayed" ? "bg-late" : "bg-ok";

  return (
    <div className="absolute inset-x-5 top-5 z-10 flex items-center justify-between gap-3">
      <button onClick={() => go("dashboard")} aria-label="Back to home" className={`grid size-12 shrink-0 place-items-center rounded-full text-ink ${glass}`}>
        <ArrowLeft className="size-5" />
      </button>
      <span className={`flex h-12 min-w-0 items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-ink ${glass}`}>
        <span className={`size-2 shrink-0 rounded-full ${dot}`} />
        <span className="truncate">{delivery.waybillId}</span>
      </span>
      <a
        href={`tel:${delivery.riderPhone.replace(/\s/g, "")}`}
        aria-label={`Call ${delivery.riderName}`}
        className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-white"
      >
        <Phone className="size-5" />
      </a>
    </div>
  );
}
