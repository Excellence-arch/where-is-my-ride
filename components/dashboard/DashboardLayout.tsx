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

const rise = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] as const },
});

export default function DashboardLayout() {
  const unlockGodMode = useApp((s) => s.unlockGodMode);
  const toast = useApp((s) => s.toast);
  const name = useApp((s) => s.name);
  const firstName = name.split(" ")[0] || "there";
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
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

  const deliveries = Object.values(activeDeliveries);
  const [first, ...rest] = deliveries;

  return (
    <div className="bg-canvas px-5 pb-36 pt-6">
      <motion.header {...rise(0)} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onAvatarTap}
            aria-label="Profile"
            className="grid size-12 select-none place-items-center rounded-full bg-brand-wash text-[16px] font-bold text-brand"
          >
            {initials}
          </motion.button>
          <div>
            <p className="text-[14px] text-muted">{greeting()}</p>
            <p className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{firstName}</p>
          </div>
        </div>
        <button aria-label="Notifications" className="relative grid size-12 place-items-center rounded-full bg-card ring-1 ring-line">
          <Bell className="size-5 text-ink" />
          {toast && <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-off text-[9px] font-bold text-white">1</span>}
        </button>
      </motion.header>

      <motion.h1 {...rise(1)} className="mt-7 text-[27px] font-bold tracking-[-0.03em] text-ink">
        On the way
      </motion.h1>

      <motion.section {...rise(2)} className="mt-4" aria-label="Active deliveries">
        <DeliveryCard waybillId={first.waybillId} />
      </motion.section>

      {rest.length > 0 && (
        <section className="mt-4 space-y-3" aria-label="Other deliveries">
          {rest.map((d, i) => (
            <motion.div key={d.waybillId} {...rise(3 + i)}>
              <DeliveryCard waybillId={d.waybillId} compact />
            </motion.div>
          ))}
        </section>
      )}

      <motion.section {...rise(4 + rest.length)} className="mt-8">
        <VoiceTriggerHero />
      </motion.section>

      <motion.section {...rise(5 + rest.length)} className="mt-6">
        <AIAuditTrail />
      </motion.section>
    </div>
  );
}
