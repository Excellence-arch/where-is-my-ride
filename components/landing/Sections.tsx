"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BellRing,
  Bike,
  Bot,
  Braces,
  Building2,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  GitBranch,
  ListChecks,
  MapPin,
  MapPinned,
  MessagesSquare,
  Mic,
  Package,
  PhoneCall,
  PhoneOff,
  Send,
  ShieldCheck,
  Smartphone,
  Split,
  TrafficCone,
  Webhook,
  WifiOff,
} from "lucide-react";
import { cardShadow, CountUp, Eyebrow, Phone, Reveal, useCycle, Waveform } from "./ui";

const REPO_URL = "https://github.com/Excellence-arch/where-is-my-ride";

// ---------------------------------------------------------------- Nav

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`sticky top-0 z-50 border-b bg-white/90 backdrop-blur transition-colors ${scrolled ? "border-slate-200" : "border-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">W</span>
          <span className="font-semibold text-slate-900">WhereIsMyRider</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="hover:text-slate-900">Features</a>
          <a href="#how-it-works" className="hover:text-slate-900">How It Works</a>
          <a href="#impact" className="hover:text-slate-900">Impact</a>
          <Link href="/rider" className="hover:text-slate-900">For Riders</Link>
        </nav>
        <Link href="/app" className="flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
          Get the App <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- Stats

export function Stats() {
  const stats = [
    { value: <CountUp to={3} suffix="s" />, label: "Live map refresh" },
    { value: <CountUp to={2} suffix=" km" />, label: "Arrival geofence alert" },
    { value: <CountUp to={45} suffix="s" />, label: "Offline detection" },
    { value: <CountUp to={3} />, label: "Ways to ask: voice, call, map" },
  ];
  return (
    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={i} delay={i * 0.08} className={`px-4 ${i > 0 ? "md:border-l md:border-slate-200" : ""} ${i % 2 === 1 ? "border-l border-slate-200 md:border-l" : ""}`}>
            <p className="text-3xl font-bold tracking-tight text-slate-900">{s.value}</p>
            <p className="mt-1 text-sm text-slate-500">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Capabilities

function CapCard({ n, icon: Icon, title, body, children, delay }: { n: string; icon: typeof Mic; title: string; body: string; children: React.ReactNode; delay: number }) {
  return (
    <Reveal delay={delay}>
      <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className={`h-full rounded-[24px] border border-slate-200 bg-white p-6 ${cardShadow}`}>
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-blue-600">{n}</span>
        </div>
        <h3 className="mt-5 text-xl font-medium text-slate-900">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{body}</p>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">{children}</div>
      </motion.div>
    </Reveal>
  );
}

export function Capabilities() {
  return (
    <section id="features" className="scroll-mt-16 bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <Eyebrow>Core capabilities</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-4xl font-normal leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Built for the realities of the Nigerian last mile.
          </h2>
          <p className="mt-4 max-w-xl text-lg text-slate-500">
            Live rider GPS, a BimpeAI voice agent and honest exception states, so every delivery status means something.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <CapCard
            n="01"
            icon={AudioLines}
            delay={0}
            title="Voice-first waybill parsing"
            body="Say it the way people say it. Spoken letters, digits, “oh” and “dash” are normalised into a waybill before BimpeAI looks the order up."
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
                <Mic className="h-4 w-4" />
              </span>
              <Waveform bars={9} height={24} color="bg-blue-300" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">Listening</span>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
              <span className="text-slate-700">“L G nine oh two one oh”</span>
              <motion.span
                className="font-mono font-bold text-blue-600"
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
              >
                LG-90210
              </motion.span>
            </div>
          </CapCard>

          <CapCard
            n="02"
            icon={MapPinned}
            delay={0.08}
            title="Live GPS telemetry map"
            body="The rider app streams the phone's GPS every few seconds. Customers see a real map, the street name, distance left and an ETA from live speed."
          >
            <MiniMap />
          </CapCard>

          <CapCard
            n="03"
            icon={WifiOff}
            delay={0}
            title="Network-drop honesty"
            body="When MTN, Airtel or Glo drops and a rider stops reporting for 45 seconds, the map says so and keeps the last trustworthy location."
          >
            <SignalBars />
          </CapCard>

          <CapCard
            n="04"
            icon={Smartphone}
            delay={0.08}
            title="Zero-friction entry"
            body="Phone number and a one-time code. First-timers add their name; riders also register their vehicle and plate, then pick up a delivery."
          >
            <OtpDemo />
          </CapCard>
        </div>
      </div>
    </section>
  );
}

function MiniMap() {
  return (
    <div className="relative h-28 overflow-hidden rounded-xl bg-white">
      <svg viewBox="0 0 300 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40 L300 20" stroke="#f1f5f9" strokeWidth="10" />
        <path d="M80 0 L60 112" stroke="#f1f5f9" strokeWidth="8" />
        <path d="M230 0 L270 112" stroke="#e2e8f0" strokeWidth="6" />
        <path d="M40 90 L250 30" stroke="#2563eb" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
        <circle cx="250" cy="30" r="6" fill="#0f172a" />
        <circle cx="40" cy="90" r="4" fill="#cbd5e1" />
      </svg>
      <motion.div
        className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white bg-blue-600 text-white"
        animate={{ left: ["13%", "70%", "13%"], top: ["80%", "37%", "80%"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <Bike className="h-4 w-4" />
      </motion.div>
      <span className="absolute bottom-3 right-3 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
        Ikorodu Rd · 7 mins
      </span>
    </div>
  );
}

function SignalBars() {
  const rows = [
    { name: "MTN", w: ["78%", "20%", "78%"] },
    { name: "Airtel", w: ["55%", "62%", "40%"] },
    { name: "Glo", w: ["24%", "8%", "30%"] },
  ];
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-slate-500">
        <span>Signal handoff</span>
        <span className="flex items-center gap-1.5 normal-case tracking-normal text-slate-700">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-800" /> Last known kept
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {rows.map((r, i) => (
          <div key={r.name} className="flex items-center gap-3 text-xs font-semibold text-slate-700">
            <span className="w-10">{r.name}</span>
            <div className="h-1.5 flex-1 rounded-full bg-slate-200">
              <motion.div
                className={`h-full rounded-full ${i === 2 ? "bg-slate-400" : "bg-blue-600"}`}
                animate={{ width: r.w }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OtpDemo() {
  const code = ["4", "8", "2", "6"];
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x >= 6 ? 0 : x + 1)), 550);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-500">Phone number</p>
        <div className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <span className="font-semibold text-slate-900">+234</span>
          <span className="h-4 w-px bg-slate-200" />
          <span className="text-slate-500">803 555 0142</span>
        </div>
      </div>
      <ArrowRight className="mb-3 h-4 w-4 text-blue-600" />
      <div>
        <p className="text-[11px] font-medium text-slate-500">One-time code</p>
        <div className="mt-1.5 flex gap-1.5">
          {code.map((d, i) => (
            <span
              key={i}
              className={`flex h-11 w-9 items-center justify-center rounded-lg border text-sm font-bold transition-colors ${
                i < n ? "border-blue-600 bg-white text-slate-900" : "border-slate-200 bg-white text-transparent"
              }`}
            >
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- How it works

function StepText({ n, icon: Icon, title, body, bullets }: { n: string; icon: typeof Mic; title: string; body: string; bullets: string[] }) {
  return (
    <Reveal>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-blue-600">{n}</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <h3 className="mt-4 text-3xl font-normal tracking-tight text-slate-900 sm:text-4xl">{title}</h3>
      <p className="mt-4 text-lg leading-relaxed text-slate-500">{body}</p>
      <ul className="mt-5 space-y-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-center gap-2 text-sm text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> {b}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-white py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow center>How it works</Eyebrow>
          <h2 className="mt-4 text-4xl font-normal leading-tight tracking-tight text-slate-900 sm:text-5xl">A delivery answer in three clear moves.</h2>
          <p className="mt-4 text-lg text-slate-500">
            No portal to learn and no repeated phone calls. Ask by voice or get a call, and the assistant answers from the rider&apos;s live position.
          </p>
        </Reveal>

        {/* 01 */}
        <div className="mt-20 grid items-center gap-10 md:grid-cols-2">
          <StepText
            n="01"
            icon={Mic}
            title="Speak the waybill"
            body="Tap the mic and say your delivery code naturally. The app turns speech into a waybill, and the BimpeAI agent reads the answer back to you."
            bullets={["Works with letters, digits, “oh” and “dash”", "Type or tap a suggestion if you can't talk"]}
          />
          <Reveal delay={0.1}>
            <div className="flex flex-col items-center gap-6 rounded-[28px] border border-blue-100 bg-blue-50 p-8 sm:flex-row">
              <Phone>
                <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">Voice tracking</p>
                <p className="mt-3 text-center text-lg font-medium leading-tight text-slate-900">Which delivery should I track?</p>
                <div className="relative mx-auto mt-5 flex h-16 w-16 items-center justify-center">
                  <motion.span className="absolute inset-0 rounded-full bg-blue-600" animate={{ scale: [1, 1.45], opacity: [0.35, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Mic className="h-7 w-7" />
                  </span>
                </div>
                <Waveform className="mx-auto mt-4 justify-center" bars={11} height={30} color="bg-blue-300" />
                <p className="mt-3 text-center text-xs font-medium text-slate-700">“LG nine zero two one zero”</p>
                <p className="mx-auto mt-3 w-fit rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">● Code detected</p>
              </Phone>
              <div className="max-w-[220px]">
                <AudioLines className="h-5 w-5 text-blue-600" />
                <p className="mt-3 text-xl font-medium leading-snug text-slate-900">Natural speech in. Structured waybill out.</p>
                <p className="mt-2 text-sm text-slate-500">LG-90210 is matched against active orders before anything is looked up.</p>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="my-16 h-px bg-slate-200" />

        {/* 02 */}
        <div className="grid items-center gap-10 md:grid-cols-2">
          <Reveal className="order-2 md:order-1">
            <ActionTrace />
          </Reveal>
          <div className="order-1 md:order-2">
            <StepText
              n="02"
              icon={Bot}
              title="BimpeAI checks the live position"
              body="The agent calls our track_delivery tool, which reads the rider's live GPS, street name and ETA, plus the order details: items, total and payment. Prefer talking? Tap “Call me” and BimpeAI rings your phone."
              bullets={["Polite, natural Nigerian English", "Answers questions about items, payment and ETA"]}
            />
          </div>
        </div>

        <div className="my-16 h-px bg-slate-200" />

        {/* 03 */}
        <div className="grid items-center gap-10 md:grid-cols-2">
          <StepText
            n="03"
            icon={Send}
            title="Everyone sees one clear status"
            body="Customers, riders and the voice agent read from the same live record, so the ETA on screen is the ETA the agent says. No more “Where are you?” calls."
            bullets={["Shareable tracking link", "Alerts at 2 km and on delivery"]}
          />
          <Reveal delay={0.1}>
            <div className="flex flex-col items-center gap-6 rounded-[28px] border border-blue-100 bg-blue-50 p-8 sm:flex-row">
              <StatusPhone />
              <div className="w-full max-w-[220px]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">One status, every channel</p>
                <div className="mt-3 space-y-2">
                  {["Customer live map", "Rider app", "BimpeAI voice & phone call"].map((c, i) => (
                    <motion.div
                      key={c}
                      initial={{ opacity: 0, x: 12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.12 }}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">{i + 1}</span>
                      {c}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ActionTrace() {
  const steps = [
    { icon: CheckCircle2, title: "Voice parsed", sub: "LG-90210" },
    { icon: Webhook, title: "track_delivery called", sub: "/api/track · live record" },
    { icon: MapPin, title: "Live GPS matched", sub: "Ikorodu Road, 2.0 km away" },
  ];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setShown((s) => (s >= steps.length + 2 ? 0 : s + 1)), 900);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <p className="flex items-center gap-2.5 text-sm font-medium text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-[11px] font-bold text-white">AI</span>
          BimpeAI action trace
        </p>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">● Live</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Action timeline</p>
          <div className="mt-2 divide-y divide-slate-100">
            {steps.map((s, i) => (
              <motion.div key={s.title} animate={{ opacity: i < shown ? 1 : 0.25 }} className="flex items-center gap-3 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <s.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                  <p className="truncate text-xs text-slate-500">{s.sub}</p>
                </div>
                <span className="text-[11px] text-slate-400">{i < shown ? "now" : ""}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl bg-blue-600 p-5 text-center text-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600">
            <Bot className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold">Tolu · BimpeAI agent</p>
          <div className="my-3 h-px w-full bg-white/20" />
          <AnimatePresence mode="wait">
            {shown > steps.length ? (
              <motion.p key="ans" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm leading-snug text-blue-50">
                “Good afternoon. Segun is on Ikorodu Road, about 2 km away. He should get to you in about 7 minutes.”
              </motion.p>
            ) : (
              <motion.div key="wave" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Waveform bars={9} height={28} color="bg-white/70" />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="mt-3 rounded-full bg-blue-700 px-3 py-1 text-[11px] font-semibold">Answered from live GPS</span>
        </div>
      </div>
    </div>
  );
}

function StatusPhone() {
  const [eta, setEta] = useState(15);
  useEffect(() => {
    const t = setInterval(() => setEta((e) => (e <= 2 ? 15 : e - 1)), 1100);
    return () => clearInterval(t);
  }, []);
  const near = eta <= 7;
  const steps = [
    { label: "Picked up from Chicken Republic", done: true },
    { label: "On the way · Live GPS", done: true },
    { label: "Within 2 km", done: near },
  ];
  return (
    <Phone>
      <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">Delivery status</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-slate-900">LG-90210</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${near ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}>
          ● {near ? "Arriving" : "On the way"}
        </span>
      </div>
      <div className="mt-3 rounded-2xl bg-blue-600 p-4 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-100">Arriving in</p>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p key={eta} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="text-3xl font-extrabold tracking-tight">
            {eta} MINS
          </motion.p>
        </AnimatePresence>
        <p className="text-[11px] text-blue-100">To Allen Avenue, Ikeja</p>
      </div>
      <div className="mt-3 space-y-2">
        {steps.map((s) => (
          <p key={s.label} className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
            <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${s.done ? "border-blue-600 bg-blue-600" : "border-blue-600"}`}>
              {s.done && <CheckCircle2 className="h-3 w-3 text-white" />}
            </span>
            {s.label}
          </p>
        ))}
      </div>
      <p className="mt-3 rounded-xl border border-slate-200 py-2 text-center text-[11px] font-semibold text-slate-900">Share live status</p>
    </Phone>
  );
}

// ---------------------------------------------------------------- Architecture

const CODE: { t: string; c?: string }[] = [
  { t: "import { NextResponse } from \"next/server\";", c: "text-slate-400" },
  { t: "import { getLiveDelivery } from \"@/lib/server/store\";", c: "text-slate-400" },
  { t: "" },
  { t: "// BimpeAI's track_delivery tool lands here", c: "text-slate-500" },
  { t: "export async function POST(request: Request) {" },
  { t: "  const args = await readArgs(request);", c: "text-blue-300" },
  { t: "  const waybill = normalizeWaybill(args.waybill_id);", c: "text-blue-300" },
  { t: "  const d = await getLiveDelivery(waybill); // GPS + God Mode", c: "text-blue-300" },
  { t: "" },
  { t: "  return NextResponse.json({", c: "text-blue-300" },
  { t: "    data: { riderName: d.riderName, etaMinutes: d.etaMinutes },", c: "text-blue-300" },
  { t: "    message: spokenStatus(d), order_summary: orderSummary(d),", c: "text-blue-300" },
  { t: "  });", c: "text-blue-300" },
  { t: "}" },
];

export function Architecture() {
  const features = [
    { icon: Webhook, title: "Webhook-native", body: "BimpeAI calls our track_delivery tool on every question, on chat, WhatsApp and phone calls alike." },
    { icon: Database, title: "Live GPS pipeline", body: "Rider phones post fixes to Postgres (Neon); customer screens refresh every 3 seconds." },
    { icon: MessagesSquare, title: "Natural Nigerian English", body: "Answers are short, polite and phrased the way a professional Lagos customer-care agent speaks." },
    { icon: ListChecks, title: "One shared truth", body: "The screen, the webhook and the voice agent all use the same merge logic, so they never disagree." },
  ];
  const flow = [
    { icon: Mic, label: "Voice" },
    { icon: Bot, label: "BimpeAI" },
    { icon: Braces, label: "/api/track" },
    { icon: Clock, label: "Live ETA" },
  ];
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal className="min-w-0">
          <Eyebrow>Architecture</Eyebrow>
          <h2 className="mt-4 text-4xl font-normal leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Fast enough for a voice conversation. Clear enough to audit.
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            One Next.js app (customer PWA, rider app and API) coordinates voice, live GPS and order data without hiding the important decisions.
          </p>
          <div className="mt-8 space-y-5">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06} y={12}>
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">{f.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{f.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="min-w-0">
          <div className="overflow-hidden rounded-[24px] bg-slate-900">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Code2 className="h-4 w-4 text-slate-400" /> app/api/track/route.ts
              </p>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-900">● Next.js 16</span>
            </div>
            <pre className="overflow-x-auto px-5 py-4 text-[12.5px] leading-6">
              {CODE.map((l, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="flex gap-5"
                >
                  <span className="w-5 select-none text-right text-slate-600">{String(i + 1).padStart(2, "0")}</span>
                  <code className={l.c ?? "text-slate-100"}>{l.t || " "}</code>
                </motion.div>
              ))}
            </pre>
          </div>
          <div className="mt-4 grid grid-cols-4 items-center rounded-[20px] border border-slate-200 bg-white p-4">
            {flow.map((f, i) => (
              <div key={f.label} className="relative flex flex-col items-center gap-2">
                <motion.span
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600"
                  animate={{ borderColor: ["#e2e8f0", "#2563eb", "#e2e8f0"] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6 }}
                >
                  <f.icon className="h-5 w-5" />
                </motion.span>
                <span className="text-center text-[11px] font-semibold text-slate-700">{f.label}</span>
                {i < flow.length - 1 && <ArrowRight className="absolute -right-2 top-3.5 h-4 w-4 text-blue-600" />}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Resilience

const STATES = [
  { key: "normal", label: "Normal", value: "15 MINS", sub: "Moving on Ikorodu Road", tone: "bg-white border-slate-200", icon: Bike },
  { key: "offline", label: "Last known location", value: "Offline since 2:05 PM", sub: "Last fix · Maryland", tone: "bg-white border-slate-200", icon: WifiOff },
  { key: "traffic", label: "Heavy traffic", value: "35 MINS", sub: "ETA adjusted for go-slow", tone: "bg-amber-50 border-amber-300", icon: TrafficCone },
  { key: "geofence", label: "Geofence update", value: "Rider is 2 km away", sub: "Customer alerted", tone: "bg-blue-600 border-blue-600 text-white", icon: BellRing },
];

export function Resilience() {
  const [state] = useCycle(STATES, 2600);
  return (
    <section id="impact" className="scroll-mt-16 bg-white py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr]">
        <Reveal>
          <div className="relative h-[380px] overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50">
            <svg viewBox="0 0 600 380" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
              <path d="M0 260 L600 170" stroke="#ffffff" strokeWidth="18" />
              <path d="M150 0 L90 380" stroke="#ffffff" strokeWidth="14" />
              <path d="M470 0 L540 380" stroke="#ffffff" strokeWidth="12" />
              <path d="M60 330 L420 120" stroke="#e2e8f0" strokeWidth="6" strokeDasharray="3 12" strokeLinecap="round" />
              <rect x="70" y="50" width="90" height="60" rx="10" fill="#dbeafe" opacity="0.6" />
              <rect x="430" y="250" width="110" height="70" rx="12" fill="#dbeafe" opacity="0.5" />
            </svg>
            <motion.div
              className={`absolute left-1/2 top-[52%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white text-white transition-colors ${
                state.key === "offline" ? "bg-slate-400" : "bg-blue-600"
              }`}
              animate={state.key === "offline" ? { scale: 1 } : { scale: [1, 1.08, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              <Bike className="h-5 w-5" />
            </motion.div>
            <div className="absolute bottom-5 left-5 right-5 flex flex-wrap gap-2">
              {STATES.map((s) => (
                <span
                  key={s.key}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    s.key === state.key ? "bg-slate-900 text-white" : "bg-white text-slate-500"
                  }`}
                >
                  {s.label}
                </span>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={state.key}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className={`absolute left-5 top-5 w-60 rounded-2xl border p-4 ${state.tone} ${cardShadow}`}
              >
                <p className={`flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider ${state.key === "geofence" ? "text-blue-100" : state.key === "traffic" ? "text-amber-600" : "text-slate-500"}`}>
                  {state.label}
                  <state.icon className="h-4 w-4" />
                </p>
                <p className={`mt-2 text-2xl font-bold tracking-tight ${state.key === "geofence" ? "text-white" : "text-slate-900"}`}>{state.value}</p>
                <p className={`mt-0.5 text-xs ${state.key === "geofence" ? "text-blue-100" : "text-slate-500"}`}>{state.sub}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <Eyebrow>Resilience and impact</Eyebrow>
          <h2 className="mt-4 text-4xl font-normal leading-tight tracking-tight text-slate-900 sm:text-5xl">The map tells the truth, even when the network can&apos;t.</h2>
          <p className="mt-4 text-lg text-slate-500">
            Every state is explicit, timestamped and useful. A normal journey looks different from a weak signal, a go-slow or an arrival, and the voice agent explains each one.
          </p>
          <div className="mt-8 space-y-5">
            {[
              { icon: PhoneOff, title: "Fewer status calls", body: "Customers ask the voice agent or open the live map instead of ringing the rider." },
              { icon: ShieldCheck, title: "Safer rider focus", body: "Riders tap Start trip once and keep their eyes on the road; location updates itself." },
              { icon: Split, title: "Clearer exceptions", body: "Offline, heavy traffic, arriving and delivered each have their own wording on screen and on the call." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-slate-900">{f.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Roles

export function Roles() {
  const roles = [
    {
      icon: Package,
      title: "Customers",
      body: "Ask by voice, get a call from BimpeAI, or watch the rider move on a live map, with a realistic ETA and alerts when it matters.",
      points: ["Voice-first self-service", "Arrival and delivered alerts"],
      href: "/app",
    },
    {
      icon: Bike,
      title: "Riders",
      body: "Register once, pick up a delivery and share live location with one tap. Demo drive simulates the route for presentations.",
      points: ["One-tap live GPS sharing", "Customer details and cash-to-collect"],
      href: "/rider",
    },
    {
      icon: Building2,
      title: "Operators",
      body: "See every active waybill, the AI audit trail of background actions, and demo controls to rehearse network drops and traffic.",
      points: ["AI audit trail", "Traffic and offline scenarios"],
      href: "/app",
    },
  ];
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <Eyebrow>Built for the delivery network</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-4xl font-normal leading-tight tracking-tight text-slate-900 sm:text-5xl">One tracking layer. Three clearer experiences.</h2>
          <p className="mt-4 max-w-xl text-lg text-slate-500">Each role sees the same delivery truth, shaped for the decision they need to make next.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {roles.map((r, i) => (
            <Reveal key={r.title} delay={i * 0.08}>
              <Link href={r.href} className="group block h-full">
                <motion.div whileHover={{ y: -4 }} className={`h-full rounded-[24px] border border-slate-200 bg-white p-6 ${cardShadow}`}>
                  <div className="flex items-start justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <r.icon className="h-5 w-5" />
                    </span>
                    <ArrowUpRight className="h-5 w-5 text-blue-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <h3 className="mt-5 text-xl font-medium text-slate-900">{r.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{r.body}</p>
                  <ul className="mt-5 space-y-2">
                    {r.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" /> {p}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- CTA + footer

export function Cta() {
  return (
    <section className="bg-slate-50 pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="grid items-center gap-10 overflow-hidden rounded-[28px] bg-blue-600 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-blue-100">Voice-first delivery visibility</p>
              <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
                Know where every rider is, even when the signal doesn&apos;t.
              </h2>
              <p className="mt-4 max-w-lg text-lg text-blue-100">Give customers, riders and operators one clear source of truth for every active delivery.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/app" className="flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                  Launch Web App <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link href="/rider" className="flex h-12 items-center gap-2 rounded-xl border border-white/40 bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800">
                  Rider App <Bike className="h-4 w-4" />
                </Link>
                <a href={REPO_URL} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2 rounded-xl border border-white/40 px-5 text-sm font-semibold text-white hover:bg-blue-700">
                  View GitHub Repo <GitBranch className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="relative mx-auto h-56 w-full max-w-xs overflow-hidden rounded-[22px] bg-blue-700">
              <svg viewBox="0 0 300 220" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
                <path d="M110 0 L60 220" stroke="#3b82f6" strokeWidth="6" />
                <path d="M0 150 L300 90" stroke="#3b82f6" strokeWidth="6" />
              </svg>
              <motion.div
                className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-blue-600"
                animate={{ left: ["30%", "70%", "30%"], top: ["40%", "30%", "40%"] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              >
                <Bike className="h-5 w-5" />
              </motion.div>
              <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/40 px-2.5 py-1 text-[11px] font-semibold text-white">
                <WifiOff className="h-3 w-3" /> Still visible
              </span>
              <div className="absolute bottom-4 left-4 rounded-xl bg-white px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Live ETA</p>
                <p className="text-xl font-extrabold text-slate-900">15 MINS</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">W</span>
            <span className="font-semibold text-slate-900">WhereIsMyRider</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-slate-500">Voice-first delivery visibility for Nigeria&apos;s last mile.</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Product</p>
          <ul className="mt-3 space-y-2 text-sm font-medium text-slate-900">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#impact">Impact</a></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Build</p>
          <ul className="mt-3 space-y-2 text-sm font-medium text-slate-900">
            <li><Link href="/app">Web App</Link></li>
            <li><Link href="/rider">Rider App</Link></li>
            <li><a href={REPO_URL} target="_blank" rel="noreferrer">GitHub Repo</a></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Technology</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["BimpeAI", "Next.js", "Neon Postgres", "OpenStreetMap"].map((t) => (
              <span key={t} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">{t}</span>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-500">Flat, implementation-minded and installable as a PWA.</p>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 border-t border-slate-100 px-4 py-6 text-xs text-slate-500 sm:px-6">
        <p>© 2026 WhereIsMyRider. Built for a hackathon.</p>
        <p className="flex items-center gap-1.5"><PhoneCall className="h-3.5 w-3.5" /> Voice by BimpeAI · Built for Nigeria&apos;s delivery network.</p>
      </div>
    </footer>
  );
}
