"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useApp } from "@/lib/store";

export default function VoiceTriggerHero() {
  const setVoiceOpen = useApp((s) => s.setVoiceOpen);

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => setVoiceOpen(true)}
      className="relative w-full overflow-hidden rounded-[24px] bg-blue-600 p-6 text-left shadow-[0_8px_30px_rgb(37,99,235,0.25)]"
    >
      {/* Flat decorative rings — solid fills only, no gradients. */}
      <span className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500" />
      <span className="absolute -right-2 top-16 h-24 w-24 rounded-full bg-blue-700" />

      <div className="relative flex items-center gap-5">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <motion.span
            className="absolute inset-0 rounded-full bg-white/25"
            animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white">
            <Mic className="h-7 w-7 text-blue-600" strokeWidth={2.5} />
          </span>
        </div>
        <div>
          <p className="text-xl font-bold leading-tight text-white">Ask “Where is my rider?”</p>
          <p className="mt-1 text-sm text-blue-100">Tap and speak your waybill number. BimpeAI answers instantly.</p>
        </div>
      </div>
    </motion.button>
  );
}
