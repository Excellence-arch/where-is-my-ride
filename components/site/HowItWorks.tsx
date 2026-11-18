"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import Image from "next/image";
import { useRef, useState } from "react";
import { EASE, Reveal, SplitHeading } from "./motion";

const STEPS = [
  { title: "Say your waybill", body: "Type it, paste it or just say “LG-90210”.", screen: "/landing/screen-track.webp", alt: "Track a waybill screen with a number pad" },
  { title: "Bimpe checks the live map", body: "She finds the rider, his street and how far he is.", screen: "/landing/screen-live.webp", alt: "Live tracking screen showing Segun on Allen Avenue" },
  { title: "You get the answer", body: "“Segun is on Allen Avenue, 12 minutes away.”", screen: "/landing/screen-answer.webp", alt: "Bimpe's answer with the rider, distance and arrival time" },
];

function Phone({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="relative aspect-[393/852] w-full overflow-hidden rounded-[44px] bg-canvas ring-[10px] ring-ink">
      <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 320px, 70vw" className="object-cover" priority={priority} />
    </div>
  );
}

function StickyStory() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const bar = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.min(STEPS.length - 1, Math.floor(v * STEPS.length * 0.999)));
  });

  return (
    <div ref={ref} className="relative hidden h-[300vh] lg:block">
      <div className="sticky top-0 flex h-screen items-center">
        <div className="relative grid w-full grid-cols-[1fr_auto] items-center gap-16 overflow-hidden rounded-[40px] bg-brand-wash px-16 py-14">
          {/* Folder tab */}
          <span aria-hidden className="absolute left-0 top-0 h-14 w-[260px] rounded-br-[28px] bg-white" />
          <span className="absolute left-6 top-3 flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white">
            Step {active + 1} of {STEPS.length}
          </span>

          <div className="relative mt-10 flex gap-8">
            <div className="relative w-[3px] rounded-full bg-white">
              <motion.div className="absolute inset-x-0 top-0 h-full origin-top rounded-full bg-brand" style={{ scaleY: bar }} />
            </div>
            <ol className="space-y-12">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <motion.div animate={{ opacity: i === active ? 1 : 0.35, x: i === active ? 0 : -6 }} transition={{ duration: 0.5, ease: EASE }}>
                    <p className="text-[15px] font-semibold text-brand">0{i + 1}</p>
                    <h3 className="mt-2 text-[40px] font-bold leading-[1.1] tracking-[-0.035em] text-ink">{s.title}</h3>
                    <p className="mt-3 max-w-[460px] text-[18px] leading-[1.55] text-muted">{s.body}</p>
                  </motion.div>
                </li>
              ))}
            </ol>
          </div>

          <div className="relative w-[320px]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 60, rotate: 4, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, y: -60, rotate: -4, scale: 0.94 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <Phone src={STEPS[active].screen} alt={STEPS[active].alt} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how" className="bg-white px-5 sm:px-10 lg:px-24" aria-label="How it works">
      <div className="mx-auto max-w-[1248px]">
        <SplitHeading lines={["How it works"]} className="text-[38px] font-bold tracking-[-0.04em] text-ink sm:text-[52px]" />

        <StickyStory />

        {/* Mobile and tablet: one card per step. */}
        <div className="mt-10 space-y-6 pb-20 sm:pb-28 lg:hidden">
          {STEPS.map((s, i) => (
            <Reveal key={s.title}>
              <div className="overflow-hidden rounded-[32px] bg-brand-wash px-6 pt-7 sm:px-10 sm:pt-10">
                <p className="text-[15px] font-semibold text-brand">0{i + 1}</p>
                <h3 className="mt-2 text-[28px] font-bold tracking-[-0.03em] text-ink sm:text-[34px]">{s.title}</h3>
                <p className="mt-2 text-[16px] text-muted">{s.body}</p>
                <div className="mx-auto mt-7 w-[220px] translate-y-6 sm:w-[260px]">
                  <Phone src={s.screen} alt={s.alt} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
