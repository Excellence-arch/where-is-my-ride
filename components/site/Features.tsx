"use client";

import { motion, useInView } from "framer-motion";
import { Link2, Mic, Phone, WifiOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { EASE, Reveal, SplitHeading, Tilt, Waveform } from "./motion";

const LiveMap3D = dynamic(() => import("./LiveMap3D"), { ssr: false });

const QUOTE = "Segun is on Allen Avenue. He should reach you by 7:14.".split(" ");

function SpokenQuote() {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  return (
    <p ref={ref} className="max-w-[440px] text-[22px] font-semibold leading-[1.3] tracking-[-0.02em] sm:text-[26px]">
      “
      {QUOTE.map((w, i) => (
        <motion.span
          key={i}
          className="inline"
          initial={{ color: "rgba(255,255,255,0.28)" }}
          animate={inView ? { color: "rgba(255,255,255,1)" } : undefined}
          transition={{ delay: 0.3 + i * 0.16, duration: 0.25 }}
        >
          {w}
          {i < QUOTE.length - 1 ? " " : ""}
        </motion.span>
      ))}
      ”
    </p>
  );
}

function LiveMapTile() {
  const [t, setT] = useState(0.55);
  const minutes = Math.max(1, Math.round(12 * (1 - t)));
  const arrived = t >= 0.999;
  return (
    <div id="live-map" className="relative h-[420px] overflow-hidden rounded-[36px] bg-canvas sm:h-[480px] lg:h-full">
      <LiveMap3D onProgress={setT} />
      <div className="pointer-events-none absolute inset-x-5 top-5 flex items-center justify-between sm:inset-x-7 sm:top-7">
        <span className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2.5 text-[14px] font-semibold text-ink ring-1 ring-white backdrop-blur-xl">
          <span className="size-2 rounded-full bg-ok" />
          LG-90210
        </span>
        <span className="rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-white">Live map</span>
      </div>
      <div className="pointer-events-none absolute bottom-5 left-5 rounded-[24px] bg-white/85 px-6 py-5 ring-1 ring-white backdrop-blur-xl sm:bottom-7 sm:left-7">
        <p className="text-[14px] text-muted">{arrived ? "Segun is outside" : "Arriving in"}</p>
        <p className="mt-1 flex items-baseline gap-2 text-ink">
          <span className="text-[48px] font-extrabold leading-none tracking-[-0.05em] tabular-nums">{arrived ? "Now" : minutes}</span>
          {!arrived && <span className="text-[20px] font-semibold text-faint">min</span>}
        </p>
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="bg-white pb-20 sm:pb-28" aria-label="Features">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-24">
        <SplitHeading lines={["No calls. Still answers."]} className="text-[38px] font-bold tracking-[-0.04em] text-ink sm:text-[52px]" />

        <div className="mt-10 grid gap-4 sm:mt-14 lg:grid-cols-12 lg:gap-6">
          <Reveal className="lg:col-span-7">
            <Tilt max={4} className="group relative h-[320px] overflow-hidden rounded-[36px] bg-brand p-7 text-white sm:h-[340px] sm:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h3 className="text-[28px] font-bold tracking-[-0.03em] sm:text-[32px]">Ask by voice</h3>
                <motion.span
                  initial={{ rotate: 0 }}
                  whileInView={{ rotate: -4 }}
                  viewport={{ once: true }}
                  className="rounded-full bg-white/15 px-5 py-3 text-[16px] font-semibold ring-1 ring-white/30 backdrop-blur-md"
                >
                  Where is my rider?
                </motion.span>
              </div>
              <div className="absolute inset-x-7 bottom-7 flex items-end justify-between gap-6 sm:inset-x-10 sm:bottom-10">
                <Waveform bars={34} height={120} className="min-w-0 overflow-hidden" />
                <button
                  type="button"
                  aria-label="Ask Bimpe by voice"
                  className="relative grid size-[72px] shrink-0 place-items-center rounded-full bg-white text-brand transition-transform hover:scale-110 active:scale-95"
                >
                  <span className="absolute inset-0 animate-ping rounded-full bg-white/40 [animation-duration:2.4s]" />
                  <Mic className="relative size-7" />
                </button>
              </div>
            </Tilt>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-5">
            <Tilt max={4} className="relative flex h-[340px] flex-col justify-between overflow-hidden rounded-[36px] bg-ink p-7 text-white sm:p-10">
              <h3 className="text-[28px] font-bold tracking-[-0.03em] sm:text-[32px]">Get a call from Bimpe</h3>
              <SpokenQuote />
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 rounded-full bg-off px-6 py-3.5 text-[15px] font-semibold">
                  <Phone className="size-[18px]" /> End call
                </span>
                <Waveform bars={14} height={40} barClassName="bg-sky" />
              </div>
            </Tilt>
          </Reveal>

          <Reveal delay={0.04} className="lg:col-span-7 lg:h-[472px]">
            <LiveMapTile />
          </Reveal>

          <div className="grid gap-4 lg:col-span-5 lg:gap-6">
            <Reveal delay={0.1}>
              <div className="group relative h-[224px] overflow-hidden rounded-[36px] bg-card p-7 ring-1 ring-line sm:p-10">
                <h3 className="max-w-[300px] text-[26px] font-bold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[30px]">Honest when the rider is offline</h3>
                <span className="absolute bottom-7 left-7 flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-white transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:-translate-y-1 sm:bottom-10 sm:left-10">
                  <WifiOff className="size-[18px]" /> Last seen 6:58 pm
                </span>
              </div>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="group relative h-[224px] overflow-hidden rounded-[36px] bg-brand-wash p-7 sm:p-10">
                <h3 className="text-[26px] font-bold tracking-[-0.03em] text-ink sm:text-[30px]">Nothing to install</h3>
                <p className="mt-2 max-w-[340px] text-[16px] text-muted">Customers open a link. No app, no sign-up.</p>
                <motion.span
                  className="absolute bottom-7 right-7 flex items-center gap-2 rounded-full bg-card px-5 py-3 text-[15px] font-semibold text-ink ring-1 ring-line sm:bottom-10 sm:right-10"
                  initial={{ rotate: -3 }}
                  whileHover={{ rotate: 0, scale: 1.05 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <Link2 className="size-[18px] text-brand" /> Tracking link
                </motion.span>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
