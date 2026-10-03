"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, MapPin, Share2 } from "lucide-react";
import StatusPill from "@/components/ui/StatusPill";
import { useLiveDelivery } from "@/lib/useLiveDelivery";
import { useApp } from "@/lib/store";

export default function DeliveryCard({ waybillId }: { waybillId: string }) {
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

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => openTracker(d.waybillId)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && openTracker(d.waybillId)}
      className="w-[78%] shrink-0 cursor-pointer snap-start rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Waybill</p>
          <p className="font-mono text-base font-bold text-slate-900">{d.waybillId}</p>
        </div>
        <button
          onClick={share}
          aria-label={`Share tracker for ${d.waybillId}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100"
        >
          {shared ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
          {d.riderName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{d.riderName}</p>
          <p className="truncate text-xs text-slate-500">{d.vehicle}</p>
        </div>
        <StatusPill status={d.status} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 text-slate-500">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{d.currentLocation}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 font-semibold text-slate-900">
          <Clock className="h-4 w-4 text-slate-400" />
          {d.etaMinutes} min
        </span>
      </div>
    </motion.div>
  );
}
