"use client";

import { motion } from "framer-motion";
import { ChevronRight, Mic, PhoneCall } from "lucide-react";
import { useApp } from "@/lib/store";

export default function VoiceTriggerHero() {
  const setVoiceOpen = useApp((s) => s.setVoiceOpen);
  const openCall = useApp((s) => s.openCall);

  return (
    <div className="space-y-3">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setVoiceOpen(true)}
        className="relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-[28px] bg-brand p-6 text-left"
      >
        <span>
          <span className="block text-[13px] font-medium text-white/70">Ask Bimpe</span>
          <span className="mt-1 block text-[22px] font-bold leading-tight tracking-[-0.02em] text-white">Where is my rider?</span>
          <span className="mt-1 block text-[14px] text-white/75">Speak or type. She answers in seconds.</span>
        </span>
        <span className="relative grid size-16 shrink-0 place-items-center">
          <motion.span
            className="absolute inset-0 rounded-full bg-white/25"
            animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
          <span className="relative grid size-16 place-items-center rounded-full bg-white">
            <Mic className="size-7 text-brand" strokeWidth={2.2} />
          </span>
        </span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => openCall("LG-90210")}
        className="flex w-full items-center gap-4 rounded-[28px] bg-card p-4 text-left ring-1 ring-line"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-white">
          <PhoneCall className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">Get a call from Bimpe</span>
          <span className="block text-[13px] text-muted">She rings you with the update.</span>
        </span>
        <ChevronRight className="size-5 text-faint" />
      </motion.button>
    </div>
  );
}
