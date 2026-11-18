"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { EASE, Magnetic, usePointer } from "./motion";

function Sticker({
  avatar,
  label,
  tone,
  className,
}: {
  avatar: string;
  label: string;
  tone: "ink" | "blue";
  className?: string;
}) {
  return (
    <span
      className={`flex items-center gap-3 whitespace-nowrap rounded-full py-2 pl-2 pr-6 text-[15px] font-semibold text-white sm:text-[17px] ${
        tone === "ink" ? "bg-ink" : "bg-brand"
      } ${className ?? ""}`}
    >
      <Image src={avatar} alt="" width={44} height={44} className="size-9 rounded-full object-cover sm:size-11" />
      {label}
    </span>
  );
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const handY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const { px, py, onPointerMove, onPointerLeave } = usePointer();
  const handRotate = useTransform(px, (v) => v * 4);
  const handX = useTransform(px, (v) => v * -18);
  const s1x = useTransform(px, (v) => v * 46);
  const s1y = useTransform(py, (v) => v * 30);
  const s2x = useTransform(px, (v) => v * -38);
  const s2y = useTransform(py, (v) => v * -26);

  return (
    <section
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative overflow-hidden bg-white pt-[104px] sm:pt-[132px] lg:min-h-[940px]"
      aria-labelledby="hero-title"
    >
      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 sm:px-10 lg:grid-cols-[1fr_1fr] lg:px-24">
        <motion.div style={{ y: textY, opacity: fade }} className="relative z-10 lg:pt-14">
          <h1 id="hero-title" className="text-[46px] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink sm:text-[68px] lg:text-[84px]">
            {["Stop calling", "your rider."].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className="block"
                  initial={{ y: "105%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 1, delay: 0.1 + i * 0.09, ease: EASE }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
            <motion.span
              className="mt-2 inline-block rounded-[22px] bg-brand px-5 pb-2 text-white sm:rounded-[26px] sm:px-6"
              initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: -2 }}
              transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.45 }}
            >
              Just ask.
            </motion.span>
          </h1>

          <motion.form
            action="/app"
            method="get"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
            className="group mt-10 flex h-[64px] w-full max-w-[520px] items-center justify-between rounded-full bg-canvas py-2 pl-6 pr-2 ring-brand transition-shadow focus-within:ring-2 sm:mt-12 sm:h-[80px] sm:pl-7"
          >
            <label className="flex min-w-0 flex-1 items-center gap-3">
              <Search className="size-5 shrink-0 text-muted" />
              <span className="sr-only">Waybill number</span>
              <input
                name="waybill"
                placeholder="Enter a waybill"
                className="w-full min-w-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted sm:text-[17px]"
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              className="h-full rounded-full bg-ink px-6 text-[16px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.97] sm:px-8"
            >
              Track
            </button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.72, ease: EASE }}
            className="mt-5 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <Link
                href="/app"
                className="group flex items-center gap-2 rounded-full bg-brand px-7 py-[18px] text-[16px] font-semibold text-white transition-colors hover:bg-brand-deep sm:px-8 sm:py-5"
              >
                Get the app
                <ArrowUpRight className="size-[18px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </Magnetic>
            <Link
              href="/rider"
              className="rounded-full px-7 py-[18px] text-[16px] font-semibold text-ink ring-[1.5px] ring-line ring-inset transition-colors hover:bg-canvas sm:px-8 sm:py-5"
            >
              I&apos;m a rider
            </Link>
          </motion.div>
        </motion.div>

        <div className="relative h-[420px] sm:h-[620px] lg:absolute lg:bottom-0 lg:right-0 lg:h-[819px] lg:w-[min(56vw,800px)]">
          <motion.div
            className="absolute inset-x-0 bottom-0 mx-auto h-full w-full max-w-[460px] sm:max-w-[620px] lg:max-w-none"
            style={{ y: handY, x: handX, rotate: handRotate }}
          >
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0, y: 120 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.25, ease: EASE }}
            >
            <Image
              src="/landing/hand-phone.webp"
              alt="A hand holding an iPhone showing the WhereIsMyRider home screen: Segun is 12 minutes away"
              fill
              priority
              sizes="(min-width: 1024px) 56vw, 100vw"
              className="object-contain object-bottom"
            />
            </motion.div>
          </motion.div>

          <motion.div className="absolute left-0 top-[18%] z-10 sm:left-[4%]" style={{ x: s1x, y: s1y }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: -14 }}
              animate={{ opacity: 1, scale: 1, rotate: -5 }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.95 }}
            >
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
                <Sticker avatar="/landing/avatar-adaeze.webp" label="Where is my rider?" tone="ink" />
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div className="absolute bottom-[7%] right-2 z-10 sm:right-[6%]" style={{ x: s2x, y: s2y }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.6, rotate: 14 }}
              animate={{ opacity: 1, scale: 1, rotate: 4 }}
              transition={{ type: "spring", stiffness: 200, damping: 14, delay: 1.15 }}
            >
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
                <Sticker avatar="/landing/avatar-segun.webp" label="Segun is 12 min away" tone="blue" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
