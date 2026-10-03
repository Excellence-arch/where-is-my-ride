"use client";

import { motion } from "framer-motion";
import { Home, LogOut, Map as MapIcon, Mic } from "lucide-react";
import { useApp } from "@/lib/store";

export default function BottomNav() {
  const screen = useApp((s) => s.screen);
  const go = useApp((s) => s.go);
  const setVoiceOpen = useApp((s) => s.setVoiceOpen);
  const logout = useApp((s) => s.logout);

  const item = (active: boolean) =>
    `flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold ${
      active ? "text-blue-600" : "text-slate-400"
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-4 pb-safe">
      <div className="mb-3 flex items-center gap-1 rounded-[24px] border border-slate-100 bg-white p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <button className={item(screen === "dashboard")} onClick={() => go("dashboard")}>
          <Home className="h-5 w-5" /> Home
        </button>
        <button className={item(screen === "map")} onClick={() => go("map")}>
          <MapIcon className="h-5 w-5" /> Live map
        </button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setVoiceOpen(true)}
          aria-label="Ask BimpeAI"
          className="flex h-12 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white"
        >
          <Mic className="h-5 w-5" />
        </motion.button>
        <button className={item(false)} onClick={logout}>
          <LogOut className="h-5 w-5" /> Sign out
        </button>
      </div>
    </nav>
  );
}
