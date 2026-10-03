import type { Metadata } from "next";
import RiderApp from "@/components/rider/RiderApp";

export const metadata: Metadata = {
  title: "WhereIsMyRider · Rider",
  description: "Share your live location with customers while you deliver.",
};

export default function RiderPage() {
  return <RiderApp />;
}
