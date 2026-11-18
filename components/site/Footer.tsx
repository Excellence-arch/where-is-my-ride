"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowUpRight, MapPin, Mic, Navigation, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { Magnetic, usePointer } from "./motion";
import { Logo } from "./Nav";

function Orb({ children, className, x, y }: { children: ReactNode; className: string; x: MotionValue<number>; y: MotionValue<number> }) {
  return (
    <motion.span className={`grid size-[72px] place-items-center overflow-hidden rounded-full sm:size-[110px] lg:size-[130px] ${className}`} style={{ x, y }}>
      {children}
    </motion.span>
  );
}

const COLUMNS = [
  { title: "Product", links: [["How it works", "#how"], ["For riders", "#riders"], ["For businesses", "#business"]] },
  { title: "App", links: [["Customer app", "/app"], ["Rider app", "/rider"]] },
  { title: "Code", links: [["GitHub", "https://github.com/Excellence-arch/where-is-my-ride"]] },
] as const;

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const wordX = useTransform(scrollYProgress, [0, 1], ["-14%", "0%"]);
  const { px, py, onPointerMove, onPointerLeave } = usePointer();
  const a = { x: useTransform(px, (v) => v * 30), y: useTransform(py, (v) => v * 30) };
  const b = { x: useTransform(px, (v) => v * -24), y: useTransform(py, (v) => v * -24) };

  return (
    <footer ref={ref} className="relative overflow-hidden bg-white" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div aria-hidden className="absolute inset-x-0 bottom-0 top-[240px] bg-brand" />

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-24">
        <div className="relative overflow-hidden rounded-[40px] bg-card p-8 ring-1 ring-line sm:p-14 lg:flex lg:items-center lg:justify-between">
          <div>
            <h2 className="max-w-[640px] text-[40px] font-extrabold leading-[1.04] tracking-[-0.045em] text-ink sm:text-[64px] lg:text-[80px]">Know where every rider is.</h2>
            <div className="mt-8 flex flex-wrap gap-3">
              <Magnetic>
                <Link href="/app" className="group flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand">
                  Get the app
                  <ArrowUpRight className="size-[18px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </Magnetic>
              <Link href="/app" className="rounded-full px-7 py-4 text-[16px] font-semibold text-ink ring-[1.5px] ring-line ring-inset transition-colors hover:bg-canvas">
                Open the web app
              </Link>
            </div>
          </div>

          <div className="mt-10 grid w-fit grid-cols-3 gap-3 lg:mt-0 lg:grid-cols-2 lg:gap-4">
            <Orb className="bg-canvas" {...a}>
              <Image src="/landing/avatar-segun.webp" alt="" width={130} height={130} className="size-full object-cover" />
            </Orb>
            <Orb className="bg-brand text-white lg:mt-10" {...b}>
              <Mic className="size-7 sm:size-10" />
            </Orb>
            <Orb className="bg-ink text-white" {...a}>
              <Navigation className="size-7 sm:size-10" />
            </Orb>
            <Orb className="bg-canvas lg:mt-10" {...b}>
              <Image src="/landing/avatar-adaeze.webp" alt="" width={130} height={130} className="size-full object-cover" />
            </Orb>
            <Orb className="bg-brand-wash text-brand" {...a}>
              <Phone className="size-7 sm:size-10" />
            </Orb>
            <Orb className="bg-ink text-white lg:mt-10" {...b}>
              <MapPin className="size-7 sm:size-10" />
            </Orb>
          </div>
        </div>

        <div className="relative grid gap-10 pb-6 pt-16 text-white sm:pt-20 lg:grid-cols-[1fr_auto]">
          <Logo dark invertMark />
          <div className="grid grid-cols-3 gap-10 sm:gap-20">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <p className="text-[14px] text-white/60">{c.title}</p>
                <ul className="mt-4 space-y-3">
                  {c.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="text-[15px] font-medium text-white transition-opacity hover:opacity-70">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <motion.p
          aria-hidden
          style={{ x: wordX }}
          className="relative select-none whitespace-nowrap text-center text-[24vw] font-extrabold leading-[0.9] tracking-[-0.06em] text-white/12 lg:text-[300px]"
        >
          Just ask.
        </motion.p>

        <div className="relative flex flex-wrap justify-between gap-3 border-t border-white/20 py-6 text-[13px] text-white/70">
          <span>© 2026 WhereIsMyRider · Lagos</span>
          <span>Voice by BimpeAI</span>
        </div>
      </div>
    </footer>
  );
}
