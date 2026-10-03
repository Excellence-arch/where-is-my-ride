"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing } from "lucide-react";
import { useApp } from "@/lib/store";

export default function ProximityToast() {
  const toast = useApp((s) => s.toast);
  const dismiss = useApp((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    try {
      navigator.vibrate?.([80, 60, 80]);
    } catch {}
    const t = setTimeout(dismiss, 5000);
    return () => clearTimeout(t);
  }, [toast, dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto max-w-md px-4 pt-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ y: -120, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            onClick={dismiss}
            className="pointer-events-auto flex items-center gap-3 rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          >
            <motion.span
              animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"
            >
              <BellRing className="h-5 w-5" />
            </motion.span>
            <div>
              <p className="text-sm font-bold text-slate-900">{toast.title}</p>
              <p className="text-sm text-slate-500">{toast.body}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
