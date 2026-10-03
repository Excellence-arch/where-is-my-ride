import type { Metadata } from "next";
import Hero from "@/components/landing/Hero";
import { Architecture, Capabilities, Cta, Footer, HowItWorks, Nav, Resilience, Roles, Stats } from "@/components/landing/Sections";

export const metadata: Metadata = {
  title: "WhereIsMyRider · Stop calling your dispatch rider. Just ask.",
  description:
    "Live rider GPS and a BimpeAI voice agent that tells customers exactly where their order is, in clear Nigerian English.",
};

export default function Landing() {
  return (
    <div className="bg-white text-slate-900">
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Capabilities />
        <HowItWorks />
        <Architecture />
        <Resilience />
        <Roles />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
