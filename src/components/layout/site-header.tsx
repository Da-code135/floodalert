"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Menu,
  Radio,
  ShieldAlert,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useFloodAlert } from "@/components/providers/floodalert-provider";
import {
  cn,
  formatClock,
  formatDay,
  formatNumber,
} from "@/lib/format";
import { riskLevelFromScore } from "@/lib/risk";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/report", label: "Report" },
  { href: "/alerts", label: "Alerts" },
];

function CloudPill() {
  const { cloudStatus, hydrated } = useFloodAlert();
  if (!hydrated) {
    return (
      <span className="hidden items-center gap-1.5 rounded-full border border-line bg-white/4 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-mist lg:inline-flex">
        <span className="size-1.5 rounded-full bg-mist/60" />
        Demo
      </span>
    );
  }

  const status =
    cloudStatus === "connected"
      ? {
          label: "Firestore live",
          dot: "bg-lime",
          text: "text-lime",
          border: "border-lime/25",
          bg: "bg-lime/8",
        }
      : cloudStatus === "connecting"
        ? {
            label: "Connecting",
            dot: "bg-aqua animate-pulse",
            text: "text-aqua",
            border: "border-aqua/25",
            bg: "bg-aqua/8",
          }
        : cloudStatus === "error"
          ? {
              label: "Local fallback",
              dot: "bg-amber",
              text: "text-amber",
              border: "border-amber/25",
              bg: "bg-amber/8",
            }
          : {
              label: "Demo data",
              dot: "bg-mist/70",
              text: "text-mist",
              border: "border-line",
              bg: "bg-white/4",
            };

  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] lg:inline-flex",
        status.border,
        status.bg,
        status.text,
      )}
      title="Data layer: Firestore when configured, otherwise a local demo store"
    >
      <span className={cn("size-1.5 rounded-full", status.dot)} />
      {status.label}
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { hydrated, cityRisk, divisionRisks, metrics, unverified, now } =
    useFloodAlert();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const topRisk = divisionRisks[0];
  const riskLevel = riskLevelFromScore(cityRisk);

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-white/6 bg-[#050e16]/95 backdrop-blur-xl">
        <div className="container-page flex h-[34px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2 text-[10px] uppercase tracking-[0.14em]">
            <span className="live-dot shrink-0" />
            <span className="shrink-0 font-semibold text-lime">Live</span>
            <span className="text-mist/40">/</span>
            {hydrated ? (
              <p className="truncate text-mist">
                Kampala risk{" "}
                <span className="font-semibold text-foam">{cityRisk}</span>
                <span className="mx-1.5 text-mist/40">·</span>
                <span
                  className={cn(
                    "font-semibold",
                    riskLevel === "Severe"
                      ? "text-coral"
                      : riskLevel === "High"
                        ? "text-amber"
                        : riskLevel === "Elevated"
                          ? "text-[#5EEAD4]"
                          : "text-aqua",
                  )}
                >
                  {riskLevel}
                </span>
                {topRisk && (
                  <>
                    <span className="mx-1.5 hidden text-mist/40 sm:inline">·</span>
                    <span className="hidden sm:inline">
                      Highest: {topRisk.division} {topRisk.score}
                    </span>
                  </>
                )}
                <span className="mx-1.5 hidden text-mist/40 md:inline">·</span>
                <span className="hidden md:inline">
                  {formatNumber(metrics.reports24h)} reports / 24h
                </span>
              </p>
            ) : (
              <p className="truncate text-mist">
                Kampala flood intelligence · East Africa Time
              </p>
            )}
          </div>
          <div className="hidden shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-mist sm:flex">
            <Radio className="size-3 text-aqua" aria-hidden />
            {hydrated ? (
              <>
                {formatDay(now)} · {formatClock(new Date(now).toISOString())} EAT
              </>
            ) : (
              <>Kampala · Uganda</>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-line/80 bg-[#060d15]/80 backdrop-blur-xl">
        <div className="container-page flex h-[64px] items-center justify-between gap-3">
          <Logo />

          <nav
            className="hidden items-center gap-0.5 lg:flex"
            aria-label="Primary"
          >
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "text-foam"
                      : "text-mist hover:bg-white/4 hover:text-foam",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                  {item.href === "/alerts" && hydrated && unverified.length > 0 && (
                    <span className="ml-1.5 inline-grid min-w-4 place-items-center rounded-full bg-amber/15 px-1 py-0.5 text-[9px] font-semibold text-amber">
                      {unverified.length}
                    </span>
                  )}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-px bg-gradient-to-r from-transparent via-aqua to-transparent" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <CloudPill />
            <Link
              href="/report"
              className="group hidden items-center gap-2 rounded-lg bg-aqua px-3.5 py-2 text-[12px] font-semibold text-[#031016] shadow-[0_0_24px_-8px_rgba(62,224,255,0.8)] transition hover:bg-[#7aecff] sm:inline-flex"
            >
              <ShieldAlert className="size-3.5" aria-hidden />
              Report flooding
              <ArrowUpRight
                className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <button
              type="button"
              className="inline-grid size-9 place-items-center rounded-lg border border-line bg-white/4 text-foam transition hover:border-aqua/30 hover:bg-white/8 lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? (
                <X className="size-4" aria-hidden />
              ) : (
                <Menu className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </div>

        {open && (
          <div
            id="mobile-nav"
            className="border-t border-line bg-[#060e17]/98 px-4 pb-4 pt-2 backdrop-blur-xl lg:hidden"
          >
            <nav className="mx-auto grid max-w-3xl gap-1" aria-label="Mobile">
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm",
                      active
                        ? "bg-aqua/10 text-aqua"
                        : "text-mist hover:bg-white/4 hover:text-foam",
                    )}
                  >
                    {item.label}
                    {item.href === "/alerts" && unverified.length > 0 && (
                      <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold text-amber">
                        {unverified.length} to verify
                      </span>
                    )}
                  </Link>
                );
              })}
              <Link
                href="/report"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-aqua px-4 py-3 text-sm font-semibold text-[#031016]"
              >
                <ShieldAlert className="size-4" aria-hidden />
                Report flooding
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
