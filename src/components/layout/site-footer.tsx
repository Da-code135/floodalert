"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  RotateCcw,
  Waves,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useFloodAlert } from "@/components/providers/floodalert-provider";
import { cn, formatNumber } from "@/lib/format";

const PRODUCT_LINKS = [
  { href: "/", label: "Live overview" },
  { href: "/report", label: "Report flooding" },
  { href: "/alerts", label: "Alert centre" },
];

const RESOURCE_LINKS = [
  { href: "/credits", label: "Photo credits" },
];

export function SiteFooter() {
  const { resetDemo, cloudStatus, hydrated } = useFloodAlert();

  const cloudLabel =
    cloudStatus === "connected"
      ? "Firestore connected"
      : cloudStatus === "connecting"
        ? "Connecting to Firestore"
        : cloudStatus === "error"
          ? "Firestore unavailable · local fallback"
          : "Local demo store";

  return (
    <footer className="mt-20 border-t border-line bg-[#050c13]/70">
      <div className="container-page py-12 sm:py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1.35fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-mist">
              FloodAlert is community flood intelligence for Kampala&apos;s last
              mile. A 20-second report becomes a verified, multilingual warning
              before the water reaches the next street.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {[
                { number: "11", target: "11.5" },
                { number: "13", target: "13.1" },
                { number: "3", target: "3.9" },
              ].map((sdg) => (
                <span
                  key={sdg.number}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white/4 px-2 py-1 text-[10px] font-medium text-mist"
                  title={`UN Sustainable Development Goal ${sdg.number}`}
                >
                  <span className="grid size-4 place-items-center rounded-[3px] bg-[#19486a] text-[8px] font-bold text-white">
                    {sdg.number}
                  </span>
                  Target {sdg.target}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="eyebrow">Product</h3>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-mist transition hover:text-foam"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="eyebrow">Evidence</h3>
            <ul className="mt-4 space-y-2.5">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-mist transition hover:text-foam"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://www.geoboundaries.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-mist transition hover:text-foam"
                >
                  Boundary data
                  <ArrowUpRight className="size-3" aria-hidden />
                </a>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-coral/20 bg-coral/[0.045] p-5">
            <div className="flex items-center gap-2">
              <Waves className="size-4 text-coral" aria-hidden />
              <h3 className="font-display text-sm font-semibold text-foam">
                Emergency numbers
              </h3>
            </div>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-mist">Police / ambulance</dt>
                <dd className="font-semibold text-foam">999 / 112</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-mist">KCCA emergency desk</dt>
                <dd className="font-semibold text-foam">0800 990 000</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-mist">Uganda Red Cross</dt>
                <dd className="font-semibold text-foam">0800 211 088</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-coral/15 pt-3 text-[10px] leading-relaxed text-mist/80">
              FloodAlert is a hackathon prototype, not an official KCCA service.
              In an emergency, call 999 first.
            </p>
          </div>
        </div>

        <div className="mt-10 hairline" />

        <div className="flex flex-col gap-4 pt-5 text-[11px] text-mist sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span>© 2026 FloodAlert</span>
            <span className="text-mist/30">·</span>
            <span>Pre-DevFest Hackathon · Kampala</span>
            <span className="text-mist/30">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  cloudStatus === "connected"
                    ? "bg-lime"
                    : cloudStatus === "error"
                      ? "bg-amber"
                      : "bg-mist/60",
                )}
              />
              {hydrated ? cloudLabel : "Demo environment"}
            </span>
            <span className="text-mist/30">·</span>
            <span>{formatNumber(1_680_000)} residents in scope</span>
          </div>

          <button
            type="button"
            onClick={resetDemo}
            className="inline-flex w-fit items-center gap-1.5 rounded-md border border-line bg-white/4 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-mist transition hover:border-aqua/30 hover:text-foam"
            title="Restore the seeded demo reports and alerts"
          >
            <RotateCcw className="size-3" aria-hidden />
            Reset demo data
          </button>
        </div>
      </div>
    </footer>
  );
}
