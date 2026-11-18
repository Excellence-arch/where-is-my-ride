"use client";

import { motion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowUpRight, MessageCircle, Mic, Navigation, Phone } from "lucide-react";
import type { ComponentType } from "react";
import { useRef } from "react";
import { Reveal, SplitHeading } from "./motion";

type Card = {
  key: string;
  chip: string;
  title: [string, string];
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: "white" | "blue" | "ink";
  href: string;
};

const CARDS: Card[] = [
  { key: "voice", chip: "“Where is my rider?”", title: ["Ask", "by voice"], Icon: Mic, tone: "white", href: "#features" },
  { key: "call", chip: "Rings in seconds", title: ["Get a", "call back"], Icon: Phone, tone: "blue", href: "#features" },
  { key: "map", chip: "Updates as he moves", title: ["Follow the", "live map"], Icon: Navigation, tone: "ink", href: "#live-map" },
  { key: "note", chip: "No call needed", title: ["Leave", "a note"], Icon: MessageCircle, tone: "white", href: "#how" },
];

const TONE = {
  white: { card: "bg-card ring-1 ring-line", title: "text-ink", sub: "text-faint", chip: "bg-canvas text-ink", icon: "bg-brand text-white", link: "text-ink", arrow: "bg-ink text-white" },
  blue: { card: "bg-brand", title: "text-white", sub: "text-white/55", chip: "bg-white/15 text-white", icon: "bg-white text-brand", link: "text-white", arrow: "bg-white text-brand" },
  ink: { card: "bg-ink", title: "text-white", sub: "text-white/45", chip: "bg-white/10 text-white", icon: "bg-brand text-white", link: "text-white", arrow: "bg-white text-ink" },
};

function CardFace({ card }: { card: Card }) {
  const t = TONE[card.tone];
  const { Icon } = card;
  return (
    <a
      href={card.href}
      className={`group relative flex h-[400px] w-[320px] shrink-0 snap-center flex-col justify-between overflow-hidden rounded-[36px] p-8 transition-transform duration-500 ease-[var(--ease-out-quint)] hover:-translate-y-3 sm:w-[360px] ${t.card}`}
    >
      <div className="flex items-start justify-between">
        <span className={`mt-3 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium ${t.chip}`}>{card.chip}</span>
        <span
          className={`grid size-[96px] shrink-0 place-items-center rounded-full transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:rotate-[-8deg] group-hover:scale-110 sm:size-[132px] ${t.icon}`}
        >
          <Icon className="size-11" strokeWidth={1.8} />
        </span>
      </div>
      <div>
        <p className={`text-[44px] font-bold leading-[1.02] tracking-[-0.04em] ${t.title}`}>
          {card.title[0]}
          <br />
          <span className={t.sub}>{card.title[1]}</span>
        </p>
        <span className={`mt-6 flex items-center gap-3 text-[15px] font-semibold ${t.link}`}>
          <span className={`grid size-11 place-items-center rounded-full transition-transform duration-300 group-hover:rotate-45 ${t.arrow}`}>
            <ArrowUpRight className="size-5" />
          </span>
          See how
        </span>
      </div>
    </a>
  );
}

function FanCard({ card, i, progress }: { card: Card; i: number; progress: MotionValue<number> }) {
  const spread = [-1.5, -0.5, 0.5, 1.5][i];
  const x = useTransform(progress, [0, 1], [spread * 30, spread * 300]);
  const y = useTransform(progress, [0, 1], [i * -6, Math.abs(spread) * 22]);
  const rotate = useTransform(progress, [0, 1], [spread * 2, spread * 6]);
  return (
    <motion.div className="absolute left-1/2 top-0 -ml-[180px]" style={{ x, y, rotate, zIndex: i === 1 || i === 2 ? 2 : 1 }}>
      <CardFace card={card} />
    </motion.div>
  );
}

export default function WaysToAsk() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-24">
        <SplitHeading lines={["Ask it your way"]} className="text-[38px] font-bold tracking-[-0.04em] text-ink sm:text-[52px]" />
        <Reveal delay={0.1} y={16}>
          <ul className="flex flex-wrap items-center gap-2">
            <li className="mr-2 text-[15px] text-muted">Works by</li>
            {["Voice", "Phone call", "Web link", "WhatsApp"].map((c) => (
              <li key={c} className="rounded-full px-5 py-3 text-[15px] font-medium text-ink ring-[1.5px] ring-line ring-inset transition-colors hover:bg-canvas">
                {c}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      {/* Desktop: the cards start stacked and fan out as the section scrolls into view. */}
      <div ref={ref} className="relative mx-auto mt-16 hidden h-[470px] max-w-[1440px] lg:block">
        {CARDS.map((c, i) => (
          <FanCard key={c.key} card={c} i={i} progress={progress} />
        ))}
      </div>

      {/* Mobile and tablet: a swipeable row. */}
      <div className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-6 sm:px-10 lg:hidden">
        {CARDS.map((c) => (
          <CardFace key={c.key} card={c} />
        ))}
      </div>
    </section>
  );
}
