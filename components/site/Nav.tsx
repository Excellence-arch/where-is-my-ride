"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowUpRight, Menu, Navigation, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EASE } from "./motion";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#riders", label: "For riders" },
  { href: "#business", label: "For businesses" },
];

export function Logo({ dark = false, size = 40, invertMark = false }: { dark?: boolean; size?: number; invertMark?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className={`grid place-items-center rounded-[12px] ${invertMark ? "bg-white" : "bg-brand"}`} style={{ width: size, height: size }}>
        <Navigation className={invertMark ? "text-brand" : "text-white"} style={{ width: size / 2, height: size / 2 }} strokeWidth={2.4} />
      </span>
      <span className={`text-[19px] font-bold tracking-[-0.02em] ${dark ? "text-white" : "text-ink"}`}>WhereIsMyRider</span>
    </span>
  );
}

export default function Nav() {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  // Slide away while scrolling down, come back on the way up.
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 240 && !open);
  });

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5"
      animate={{ y: hidden ? -120 : 0 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <nav className="mx-auto flex h-[64px] max-w-[1392px] items-center justify-between rounded-full bg-ink py-3 pl-3 pr-3 sm:h-[76px] sm:pl-6" aria-label="Main">
        <Link href="/" aria-label="WhereIsMyRider home" className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
          <Logo dark />
        </Link>

        <ul className="hidden items-center gap-10 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="group relative text-[15px] font-semibold text-white/90 transition-colors hover:text-white">
                {l.label}
                <span className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full bg-brand transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/app" className="rounded-full px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/10">
            Sign in
          </Link>
          <Link
            href="/app"
            className="group flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-[15px] font-semibold text-white transition-[background-color,transform] hover:bg-brand-deep active:scale-[0.97]"
          >
            Get the app
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="grid size-10 place-items-center rounded-full bg-white/10 text-white sm:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mx-auto mt-2 rounded-[28px] bg-ink p-3 sm:hidden"
          >
            {LINKS.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i + 0.05 }}
                className="block rounded-[18px] px-4 py-4 text-[17px] font-semibold text-white active:bg-white/10"
              >
                {l.label}
              </motion.a>
            ))}
            <Link href="/app" className="mt-2 flex items-center justify-center gap-2 rounded-full bg-brand py-4 text-[16px] font-semibold text-white">
              Get the app <ArrowUpRight className="size-4" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
