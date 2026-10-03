"use client";

import { ArrowLeft, Phone } from "lucide-react";
import StatusPill from "@/components/ui/StatusPill";
import type { LiveDelivery } from "@/lib/demoState";
import { useApp } from "@/lib/store";

export default function TrackingSummary({ delivery }: { delivery: LiveDelivery }) {
  const go = useApp((s) => s.go);

  return (
    <div className="absolute inset-x-4 top-4 z-10 flex items-center gap-3 rounded-[24px] border border-slate-100 bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
      <button
        onClick={() => go("dashboard")}
        aria-label="Back to dashboard"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm font-bold text-slate-900">{delivery.waybillId}</p>
        <p className="truncate text-sm text-slate-500">
          Rider <span className="font-semibold text-slate-900">{delivery.riderName}</span> · {delivery.vehicle.split(" · ")[1]}
        </p>
      </div>
      <StatusPill status={delivery.status} />
      <a
        href={`tel:${delivery.riderPhone.replace(/\s/g, "")}`}
        aria-label={`Call ${delivery.riderName}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white"
      >
        <Phone className="h-5 w-5" />
      </a>
    </div>
  );
}
