"use client";

import { motion } from "framer-motion";
import { Home, LogOut, Map as MapIcon, Mic } from "lucide-react";
import { useApp } from "@/lib/store";

export default function BottomNav() {
  const screen = useApp((s) => s.screen);
  const go = useApp((s) => s.go);
  const setVoiceOpen = useApp((s) => s.setVoiceOpen);
  const logout = useApp((s) => s.logout);

  const tab = (key: "dashboard" | "map", label: string, Icon: typeof Home) => {
    const active = screen === key;
    return (
      <button
        onClick={() => go(key)}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={`relative flex h-14 items-center justify-center gap-2 rounded-full transition-colors ${active ? "px-5 text-ink" : "w-14 text-white/70 hover:text-white"}`}
      >
        {active && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
        <Icon className="relative size-5" />
        {active && <span className="relative text-[15px] font-semibold">{label}</span>}
      </button>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-5 pb-safe" aria-label="App">
      <div className="mb-4 flex items-center justify-between rounded-full bg-ink p-1.5">
        {tab("dashboard", "Home", Home)}
        {tab("map", "Live map", MapIcon)}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setVoiceOpen(true)}
          aria-label="Ask Bimpe"
          className="grid size-14 place-items-center rounded-full bg-brand text-white"
        >
          <Mic className="size-6" />
        </motion.button>
        <button onClick={logout} aria-label="Sign out" className="grid size-14 place-items-center rounded-full text-white/70 hover:text-white">
          <LogOut className="size-5" />
        </button>
      </div>
    </nav>
  );
}
