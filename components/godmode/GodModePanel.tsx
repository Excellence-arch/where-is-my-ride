"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MapPinned, RotateCcw, TrafficCone, WifiOff, X, Zap } from "lucide-react";
import { useApp } from "@/lib/store";

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-blue-600" : "bg-slate-200"}`}>
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow ${on ? "right-1" : "left-1"}`}
      />
    </span>
  );
}

/**
 * Hackathon God Mode. Hidden by default: triple-tap the avatar on the
 * dashboard (or press Shift+G) to unlock. Once unlocked a small floating
 * bolt button stays on screen so presenters can reach it from the map.
 */
export default function GodModePanel() {
  const { godModeUnlocked, godModeOpen, setGodModeOpen, flags, screen } = useApp();
  const toggleNetworkDrop = useApp((s) => s.toggleNetworkDrop);
  const toggleTraffic = useApp((s) => s.toggleTraffic);
  const triggerGeofence = useApp((s) => s.triggerGeofence);
  const resetDemo = useApp((s) => s.resetDemo);
  const openTracker = useApp((s) => s.openTracker);

  if (!godModeUnlocked || screen === "auth") return null;

  const rows = [
    {
      icon: WifiOff,
      title: "Network drop",
      sub: "MTN / Airtel / Glo / 9mobile offline",
      on: flags.networkDrop,
      onClick: toggleNetworkDrop,
    },
    {
      icon: TrafficCone,
      title: "Heavy traffic",
      sub: "Recalibrate ETA 15 → 35 mins",
      on: flags.heavyTraffic,
      onClick: toggleTraffic,
    },
  ];

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setGodModeOpen(!godModeOpen)}
        aria-label="Toggle demo controls"
        className="fixed right-4 top-[42%] z-30 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_8px_30px_rgb(0,0,0,0.2)] sm:right-[calc(50%-224px+16px)]"
      >
        <Zap className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {godModeOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="fixed inset-x-4 top-[148px] z-30 mx-auto max-w-[400px] rounded-[24px] bg-slate-900 p-4 text-white shadow-[0_8px_30px_rgb(0,0,0,0.25)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-bold">God Mode · Demo controls</p>
              </div>
              <button onClick={() => setGodModeOpen(false)} aria-label="Close" className="rounded-full p-1 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {rows.map(({ icon: Icon, title, sub, on, onClick }) => (
                <button
                  key={title}
                  onClick={() => {
                    onClick();
                    if (screen !== "map") openTracker("LG-90210");
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl bg-slate-800 p-3 text-left"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="block truncate text-xs text-slate-400">{sub}</span>
                  </span>
                  <Toggle on={on} />
                </button>
              ))}

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <button
                  onClick={() => {
                    if (screen !== "map") openTracker("LG-90210");
                    triggerGeofence();
                  }}
                  className="flex items-center gap-3 rounded-2xl bg-blue-600 p-3 text-left"
                >
                  <MapPinned className="h-5 w-5" />
                  <span>
                    <span className="block text-sm font-semibold">Trigger 2km geofence</span>
                    <span className="block text-xs text-blue-100">Fires approach alert</span>
                  </span>
                </button>
                <button
                  onClick={resetDemo}
                  aria-label="Reset demo"
                  className="flex w-14 flex-col items-center justify-center gap-1 rounded-2xl bg-slate-800 text-[10px] font-semibold text-slate-300"
                >
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-snug text-slate-400">
              Overrides sync to <span className="font-mono">/api/track</span>, so the BimpeAI voice agent reports the same state.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
