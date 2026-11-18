import type { Metadata } from "next";
import Audiences from "@/components/site/Audiences";
import Features from "@/components/site/Features";
import Footer from "@/components/site/Footer";
import Hero from "@/components/site/Hero";
import HowItWorks from "@/components/site/HowItWorks";
import { MotionRoot } from "@/components/site/motion";
import Nav from "@/components/site/Nav";
import WaysToAsk from "@/components/site/WaysToAsk";

export const metadata: Metadata = {
  title: "WhereIsMyRider · Stop calling your rider. Just ask.",
  description:
    "Ask Bimpe where your delivery rider is, by voice, by text or with a call-back, and watch him move on a live map. No calls while he rides.",
};

export default function Landing() {
  return (
    <MotionRoot>
      <div className="overflow-x-clip bg-white font-sans text-ink">
        <Nav />
        <main>
          <Hero />
          <WaysToAsk />
          <Features />
          <HowItWorks />
          <Audiences />
        </main>
        <Footer />
      </div>
    </MotionRoot>
  );
}
