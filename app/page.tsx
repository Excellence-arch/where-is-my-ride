"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import SplashToAuth from "@/components/auth/SplashToAuth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import LiveMapScreen from "@/components/map/LiveMapScreen";
import VoiceSheet from "@/components/dashboard/VoiceSheet";
import CallSheet from "@/components/call/CallSheet";
import LiveSync from "@/components/LiveSync";
import GodModePanel from "@/components/godmode/GodModePanel";
import ProximityToast from "@/components/ui/ProximityToast";
import BottomNav from "@/components/ui/BottomNav";
import { readSession, useApp } from "@/lib/store";
import { activeDeliveries } from "@/lib/deliveries";

export default function Home() {
  const screen = useApp((s) => s.screen);
  const login = useApp((s) => s.login);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = readSession();
    if (saved) login(saved);
    // Shared tracker links: /?track=LG-90210
    const shared = new URLSearchParams(window.location.search).get("track");
    if (saved && shared && activeDeliveries[shared]) useApp.getState().openTracker(shared);
    setReady(true);

    // Desktop shortcut for presenters: Shift+G toggles God Mode.
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.shiftKey && e.key.toLowerCase() === "g") {
        const s = useApp.getState();
        s.godModeUnlocked ? s.setGodModeOpen(!s.godModeOpen) : s.unlockGodMode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [login]);

  if (!ready) return <div className="min-h-dvh bg-slate-50" />;

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-md overflow-hidden bg-slate-50">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="min-h-dvh"
        >
          {screen === "auth" && <SplashToAuth />}
          {screen === "dashboard" && <DashboardLayout />}
          {screen === "map" && <LiveMapScreen />}
        </motion.div>
      </AnimatePresence>

      {screen !== "auth" && <BottomNav />}
      {screen !== "auth" && <LiveSync />}
      <VoiceSheet />
      <CallSheet />
      <GodModePanel />
      <ProximityToast />
    </main>
  );
}
