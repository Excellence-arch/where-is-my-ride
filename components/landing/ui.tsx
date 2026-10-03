"use client";

import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const cardShadow = "shadow-[0_8px_30px_rgb(0,0,0,0.04)]";

/** Fade + rise into view once, as the section scrolls in. */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 24,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-xs font-medium uppercase tracking-[0.12em] text-blue-600 ${center ? "justify-center" : ""}`}>
      <span className="h-px w-5 bg-blue-600" />
      {children}
    </p>
  );
}

/** Animated equaliser bars for "listening" states. */
export function Waveform({ bars = 11, className = "", color = "bg-blue-600", height = 36 }: { bars?: number; className?: string; color?: string; height?: number }) {
  return (
    <div className={`flex items-center gap-[3px] ${className}`} style={{ height }} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const mid = Math.abs(i - (bars - 1) / 2);
        const peak = Math.max(0.25, 1 - mid / (bars / 1.6));
        return (
          <motion.span
            key={i}
            className={`w-[3px] rounded-full ${color}`}
            animate={{ height: [height * 0.2, height * peak, height * 0.35, height * peak * 0.8, height * 0.2] }}
            transition={{ duration: 1.1 + (i % 3) * 0.15, repeat: Infinity, delay: i * 0.06, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}

/** Counts up to a number when scrolled into view. */
export function CountUp({ to, suffix = "", prefix = "", decimals = 0 }: { to: number; suffix?: string; prefix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const [text, setText] = useState(`${prefix}0${suffix}`);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration: 1.4, ease: "easeOut" });
    const unsub = mv.on("change", (v) => setText(`${prefix}${v.toFixed(decimals)}${suffix}`));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, mv, to, prefix, suffix, decimals]);
  return <span ref={ref}>{text}</span>;
}

/** Cycles through items on an interval (for rotating transcripts / states). */
export function useCycle<T>(items: T[], ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % items.length), ms);
    return () => clearInterval(t);
  }, [items.length, ms]);
  return [items[i], i] as const;
}

/** Minimal phone frame for mockups. */
export function Phone({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-[220px] shrink-0 rounded-[34px] border-[7px] border-slate-900 bg-white ${className}`}>
      <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-semibold text-slate-900">
        <span>9:41</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-sm bg-slate-900" />
          <span className="h-2 w-4 rounded-[3px] border border-slate-900" />
        </span>
      </div>
      <div className="px-4 pb-5 pt-2">{children}</div>
    </div>
  );
}
