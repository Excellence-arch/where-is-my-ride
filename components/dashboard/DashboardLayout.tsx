"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { activeDeliveries } from "@/lib/deliveries";
import { useApp } from "@/lib/store";
import DeliveryCard from "./DeliveryCard";
import VoiceTriggerHero from "./VoiceTriggerHero";
import AIAuditTrail from "./AIAuditTrail";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardLayout() {
  const unlockGodMode = useApp((s) => s.unlockGodMode);
  const toast = useApp((s) => s.toast);
  const taps = useRef<number[]>([]);

  // Hidden God Mode: triple-tap the avatar within 600ms.
  const onAvatarTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 600), now];
    if (taps.current.length >= 3) {
      taps.current = [];
      unlockGodMode();
    }
  };

  return (
    <div className="pb-32">
      <header className="flex items-center justify-between px-5 pb-2 pt-8">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onAvatarTap}
            aria-label="Profile"
            className="flex h-12 w-12 select-none items-center justify-center rounded-2xl bg-blue-100 text-base font-bold text-blue-700"
          >
            AO
          </motion.button>
          <div>
            <p className="text-sm text-slate-500">{greeting()},</p>
            <p className="text-lg font-bold tracking-tight text-slate-900">Adaeze 👋</p>
          </div>
        </div>
        <button
          aria-label="Notifications"
          className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <Bell className="h-5 w-5 text-slate-700" />
          <span className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full border-2 border-white ${toast ? "bg-blue-600" : "bg-rose-500"}`} />
        </button>
      </header>

      <section className="mt-5">
        <div className="flex items-baseline justify-between px-5">
          <h2 className="text-base font-bold text-slate-900">Active deliveries</h2>
          <span className="text-sm text-slate-500">{Object.keys(activeDeliveries).length} on the road</span>
        </div>
        <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-4">
          {Object.values(activeDeliveries).map((d) => (
            <DeliveryCard key={d.waybillId} waybillId={d.waybillId} />
          ))}
        </div>
      </section>

      <section className="px-5">
        <VoiceTriggerHero />
      </section>

      <section className="mt-6 px-5">
        <AIAuditTrail />
      </section>
    </div>
  );
}
