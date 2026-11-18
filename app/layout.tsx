import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import RegisterSW from "@/components/pwa/RegisterSW";
import "./globals.css";

// Self-hosted so builds don't depend on reaching Google Fonts.
const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-Variable.woff2",
  variable: "--font-jakarta",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WhereIsMyRider",
  description: "Live rider tracking with a BimpeAI voice assistant.",
  applicationName: "WhereIsMyRider",
  appleWebApp: { capable: true, title: "WhereIsMyRider", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2356f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh bg-slate-50 font-sans antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
