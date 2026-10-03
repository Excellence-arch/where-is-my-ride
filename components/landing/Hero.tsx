"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowUpRight, Bike, CheckCircle2, Mic, Play } from "lucide-react";
import { cardShadow, Waveform, useCycle } from "./ui";

// Real phrases the voice sheet understands, and what the waybill parser turns them into.
const TRANSCRIPTS = [
  { said: "Track waybill L G nine oh two one oh.", got: "LG-90210" },
  { said: "Where is my rider for L G dash four four oh two one?", got: "LG-44021" },
  { said: "How far is A B one one eight seven three?", got: "AB-11873" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live GPS · BimpeAI voice · Phone call-backs
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mx-auto mt-6 max-w-4xl text-center text-[40px] font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl"
        >
          Stop Calling Your Dispatch Rider.{" "}
          <span className="relative inline-block">
            Just Ask.
            <motion.span
              className="absolute -bottom-1 left-0 h-2 rounded-full bg-blue-600/20 sm:h-3"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
            />
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-slate-500"
        >
          WhereIsMyRider pairs your rider&apos;s live GPS with a BimpeAI voice agent. Say your waybill, or let the agent call you,
          and hear exactly where your order is, in clear Nigerian English.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/app"
            className="group flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Try Live Demo
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#how-it-works"
            className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-900 transition-colors hover:border-slate-300"
          >
            See How It Works <Play className="h-4 w-4" />
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14"
        >
          <Workspace />
        </motion.div>
      </div>
    </section>
  );
}

/** The animated "live tracking workspace" mock under the hero. */
function Workspace() {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="flex items-center justify-between px-2 pb-3 pt-1">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-blue-600" />
        </div>
        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:block">Live tracking workspace</p>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Demo connected
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <WaybillCard />
        <VoiceCard />
        <MetricsCard />
      </div>
    </div>
  );
}

function WaybillCard() {
  // Rider glides along the route while the ETA ticks down, then loops.
  const [eta, setEta] = useState(15);
  useEffect(() => {
    const t = setInterval(() => setEta((e) => (e <= 2 ? 15 : e - 1)), 900);
    return () => clearInterval(t);
  }, []);
  const progress = (15 - eta) / 13;
  const arriving = eta <= 4;

  return (
    <div className={`flex flex-col rounded-[22px] border border-slate-100 bg-white p-5 ${cardShadow}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Active waybill</p>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            arriving ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${arriving ? "bg-blue-600" : "bg-emerald-600"}`} />
          {arriving ? "Arriving" : "On the way"}
        </span>
      </div>
      <p className="mt-3 font-mono text-2xl font-bold text-slate-900">LG-90210</p>
      <p className="text-sm text-slate-500">Maryland → Allen Avenue, Ikeja</p>

      <div className="relative mt-4 h-28 overflow-hidden rounded-2xl bg-slate-50">
        <svg viewBox="0 0 260 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
          <path d="M0 80 L260 30" stroke="#e2e8f0" strokeWidth="10" />
          <path d="M70 0 L110 112" stroke="#e2e8f0" strokeWidth="8" />
          <path d="M28 92 L232 26" stroke="#bfdbfe" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path
            d="M28 92 L232 26"
            stroke="#2563eb"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - progress}
            style={{ transition: "stroke-dashoffset 0.9s linear" }}
          />
          <circle cx="28" cy="92" r="5" fill="#fff" stroke="#0f172a" strokeWidth="3" />
          <circle cx="232" cy="26" r="6" fill="#0f172a" />
        </svg>
        <motion.div
          className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white bg-blue-600 text-white shadow-[0_4px_14px_rgb(0,0,0,0.2)]"
          animate={{ left: `${(28 + progress * 204) / 2.6}%`, top: `${(92 - progress * 66) / 1.12}%` }}
          transition={{ duration: 0.9, ease: "linear" }}
        >
          <Bike className="h-4 w-4" />
        </motion.div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Estimated arrival</p>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={eta}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              className="text-3xl font-bold tracking-tight text-slate-900"
            >
              {eta} Mins
            </motion.p>
          </AnimatePresence>
        </div>
        <ArrowUpRight className="h-5 w-5 text-blue-600" />
      </div>
    </div>
  );
}

function VoiceCard() {
  const [item, i] = useCycle(TRANSCRIPTS, 4200);
  const [typed, setTyped] = useState("");
  useEffect(() => {
    setTyped("");
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setTyped(item.said.slice(0, n));
      if (n >= item.said.length) clearInterval(t);
    }, 38);
    return () => clearInterval(t);
  }, [item, i]);
  const done = typed.length >= item.said.length;

  return (
    <div className="flex flex-col items-center rounded-[22px] bg-blue-600 p-5 text-white">
      <div className="flex w-full items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-blue-100">Voice assistant</p>
        <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" /> Listening
        </span>
      </div>
      <div className="relative mt-6 flex h-16 w-16 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full bg-white/30"
          animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white">
          <Mic className="h-7 w-7 text-blue-600" />
        </span>
      </div>
      <Waveform className="mt-6" color="bg-white/80" bars={13} height={40} />
      <div className="mt-6 w-full rounded-2xl bg-blue-700 px-4 py-3 text-center">
        <p className="min-h-[40px] text-sm font-medium leading-snug">
          “{typed}
          <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-white" />”
        </p>
        <AnimatePresence mode="wait">
          {done && (
            <motion.p
              key={item.got}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-1 text-xs text-blue-100"
            >
              BimpeAI understood <span className="font-mono font-bold text-white">{item.got}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MetricsCard() {
  const [secs, setSecs] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => (s >= 3 ? 1 : s + 1)), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={`flex flex-col rounded-[22px] border border-slate-100 bg-white p-5 ${cardShadow}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Live telemetry</p>
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
      </div>
      <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">2.0 km</p>
      <p className="text-sm text-slate-500">to drop-off · from rider GPS</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
        <motion.div className="h-full rounded-full bg-blue-600" animate={{ width: ["35%", "78%", "35%"] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-100 p-3">
        <div>
          <p className="text-xl font-bold tracking-tight text-slate-900">{secs}s ago</p>
          <p className="text-xs text-slate-500">last GPS sync · refresh every 3s</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Activity className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> All tracking services operational
      </p>
    </div>
  );
}
