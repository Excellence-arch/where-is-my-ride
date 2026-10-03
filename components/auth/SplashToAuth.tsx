"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/store";

type Step = "phone" | "otp";

const slide = {
  initial: { y: 48, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -48, opacity: 0 },
  transition: { type: "spring", stiffness: 380, damping: 32 },
} as const;

export default function SplashToAuth() {
  const login = useApp((s) => s.login);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = phone.replace(/\D/g, "");
  const phoneValid = digits.length >= 10;

  useEffect(() => {
    // Any 4 digits = verified. Mock auth, zero friction.
    if (otp.every((d) => d.length === 1)) {
      const t = setTimeout(() => login(`+234 ${digits.replace(/^0/, "")}`), 350);
      return () => clearTimeout(t);
    }
  }, [otp, digits, login]);

  const setDigit = (i: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length > 1) {
      // Pasted the whole code.
      const next = clean.slice(0, 4).split("");
      setOtp([0, 1, 2, 3].map((k) => next[k] ?? ""));
      otpRefs.current[Math.min(next.length, 3)]?.focus();
      return;
    }
    setOtp((prev) => prev.map((d, k) => (k === i ? clean : d)));
    if (clean && i < 3) otpRefs.current[i + 1]?.focus();
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-10 pt-16">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-[0_8px_30px_rgb(37,99,235,0.25)]">
          <MapPin className="h-6 w-6 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight text-slate-900">WhereIsMyRider</p>
          <p className="text-sm text-slate-500">Track every dispatch, by voice.</p>
        </div>
      </div>

      <div className="mt-14">
        <h1 className="text-[32px] font-bold leading-tight tracking-tight text-slate-900">
          {step === "phone" ? (
            <>
              Know exactly where
              <br />
              your rider is.
            </>
          ) : (
            "Enter your code"
          )}
        </h1>
        <p className="mt-3 text-base text-slate-500">
          {step === "phone"
            ? "Sign in with your phone number. No passwords, no stress."
            : `We sent a 4-digit code to +234 ${digits.replace(/^0/, "")}.`}
        </p>
      </div>

      <div className="relative mt-10 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {step === "phone" ? (
            <motion.form
              key="phone"
              {...slide}
              onSubmit={(e) => {
                e.preventDefault();
                if (phoneValid) setStep("otp");
              }}
              className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <label htmlFor="phone" className="text-sm font-medium text-slate-500">
                Phone number
              </label>
              <div className="mt-2 flex h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-600 focus-within:bg-white">
                <span className="text-lg font-semibold text-slate-900">🇳🇬 +234</span>
                <span className="h-6 w-px bg-slate-200" />
                <input
                  id="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="803 555 0142"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, "").slice(0, 14))}
                  className="h-full w-full bg-transparent text-lg font-semibold tracking-wide text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                  autoFocus
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={!phoneValid}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-semibold text-white transition-colors disabled:bg-slate-200 disabled:text-slate-400"
              >
                Send code <ArrowRight className="h-5 w-5" />
              </motion.button>
            </motion.form>
          ) : (
            <motion.div
              key="otp"
              {...slide}
              className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <div className="flex justify-between gap-3">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    aria-label={`Digit ${i + 1}`}
                    autoFocus={i === 0}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
                    }}
                    className={`h-16 w-full rounded-2xl border text-center text-2xl font-bold text-slate-900 outline-none transition-colors ${
                      d ? "border-blue-600 bg-white" : "border-slate-200 bg-slate-50"
                    } focus:border-blue-600 focus:bg-white`}
                  />
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setOtp(["", "", "", ""]);
                    setStep("phone");
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-500"
                >
                  <ArrowLeft className="h-4 w-4" /> Change number
                </button>
                <span className="text-sm text-slate-400">Demo: any 4 digits</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck className="h-4 w-4" /> Voice assistant powered by BimpeAI
      </p>
    </div>
  );
}
