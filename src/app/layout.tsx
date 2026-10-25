import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { FloodAlertProvider } from "@/components/providers/floodalert-provider";
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register";
import { ConnectionBanner } from "@/components/providers/connection-banner";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FloodAlert — Kampala flood warning",
    template: "%s · FloodAlert",
  },
  description:
    "FloodAlert is a community-powered flood early warning for Kampala. A 20-second report becomes a verified, bilingual alert for the streets most at risk.",
  applicationName: "FloodAlert",
  category: "technology",
  keywords: [
    "FloodAlert",
    "Luganda",
    "Kampala",
    "Uganda",
    "flood early warning",
    "SDG 11",
    "SDG 13",
    "community reporting",
    "Gemini",
    "Firebase",
    "climate resilience",
  ],
  authors: [{ name: "FloodAlert team" }],
  creator: "FloodAlert team",
  openGraph: {
    type: "website",
    locale: "en_UG",
    siteName: "FloodAlert",
    title: "FloodAlert — Kampala flood warning",
    description:
      "When the water rises, the warning should rise faster. Community flood reports, Gemini triage and last-mile alerts for Kampala.",
    images: [
      {
        url: "/demo/flood-1.jpg",
        width: 640,
        height: 599,
        alt: "A flooded street in Bwaise, Kampala",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FloodAlert — Kampala flood warning",
    description:
      "Community flood reports, Gemini triage and bilingual last-mile alerts for Kampala.",
    images: ["/demo/flood-1.jpg"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#05090f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body className="flex min-h-dvh flex-col antialiased">
        <FloodAlertProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <ConnectionBanner />
        </FloodAlertProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
