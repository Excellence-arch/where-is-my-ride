"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { EASE, Reveal } from "./motion";

export default function Audiences() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const riderX = useTransform(scrollYProgress, [0, 0.55], [120, 0]);
  const listY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section className="bg-white px-5 pb-20 pt-20 sm:px-10 sm:pb-28 lg:px-24 lg:pt-28" aria-label="Who it is for">
      <div ref={ref} className="mx-auto grid max-w-[1248px] gap-4 lg:grid-cols-2 lg:gap-6">
        <Reveal>
          <div id="riders" className="relative h-[560px] scroll-mt-28 overflow-hidden rounded-[40px] bg-card p-8 ring-1 ring-line sm:p-12">
            <p className="text-[15px] font-semibold text-muted">For riders</p>
            <h2 className="mt-3 max-w-[460px] text-[40px] font-bold leading-[1.08] tracking-[-0.04em] text-ink sm:text-[52px]">You ride. Bimpe answers.</h2>
            <Link
              href="/rider"
              className="group relative z-10 mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-brand-deep"
            >
              Ride with us
              <ArrowUpRight className="size-[18px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>

            <motion.div className="absolute -bottom-2 -right-6 w-[380px] sm:w-[460px]" style={{ x: riderX }}>
              <Image src="/landing/rider.webp" alt="A dispatch rider in a blue jacket on a blue motorbike with a delivery box" width={450} height={300} className="h-auto w-full mix-blend-multiply" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
              whileInView={{ opacity: 1, scale: 1, rotate: -4 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.3 }}
              className="absolute bottom-[230px] right-8 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-white sm:bottom-[270px]"
            >
              No calls on the road
            </motion.span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div id="business" className="relative flex h-[560px] scroll-mt-28 flex-col justify-between overflow-hidden rounded-[40px] bg-ink p-8 text-white sm:p-12">
            <div>
              <p className="text-[15px] font-semibold text-white/55">For delivery businesses</p>
              <h2 className="mt-3 max-w-[480px] text-[40px] font-bold leading-[1.08] tracking-[-0.04em] sm:text-[52px]">Fewer “where is my order?” calls.</h2>
            </div>
            <motion.ul className="space-y-3" style={{ y: listY }}>
              {["Every rider on one live map", "A log of each Bimpe answer", "Works by link, voice or phone call"].map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: EASE }}
                  className="w-fit rounded-full bg-white/10 px-5 py-3 text-[15px] font-medium transition-colors hover:bg-white/15"
                >
                  {item}
                </motion.li>
              ))}
            </motion.ul>
            <Link href="/app" className="group inline-flex w-fit items-center gap-2 rounded-full bg-white px-7 py-4 text-[16px] font-semibold text-ink transition-transform hover:scale-[1.03] active:scale-[0.97]">
              See it live
              <ArrowUpRight className="size-[18px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
